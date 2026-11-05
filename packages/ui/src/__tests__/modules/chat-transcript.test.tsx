import { useCallback } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessageData } from '../../modules/chat'
import { ChatTranscript, ChatTranscriptSkeleton } from '../../modules/chat'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	getSlot,
	liveRegion,
	present,
	renderUI,
	screen,
} from '../helpers'

const messages: ChatMessageData[] = [
	{ id: '1', sender: 'user', content: 'Hi there' },
	{ id: '2', sender: 'assistant', content: 'Hello!' },
]

describe('ChatTranscript', () => {
	it('renders each message, passing its sender straight to the bubble', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} />)

		expect(screen.getByText('Hi there')).toBeInTheDocument()

		expect(screen.getByText('Hello!')).toBeInTheDocument()

		const bubbles = allBySlot(container, 'chat-message')

		expect(present(bubbles[0], 'user bubble')).toHaveAttribute('data-sender', 'user')

		expect(present(bubbles[1], 'assistant bubble')).toHaveAttribute('data-sender', 'assistant')
	})

	it('renders nothing in the list when there are no messages', () => {
		const { container } = renderUI(<ChatTranscript messages={[]} />)

		expect(allBySlot(container, 'chat-message')).toHaveLength(0)

		expect(bySlot(container, 'chat-transcript')).toBeInTheDocument()
	})

	it('signals keyboard focus with the design-system ring, not the browser default', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} />)

		const transcript = getSlot(container, 'chat-transcript')

		// Scroll containers are keyboard-focusable; suppress the UA outline and
		// draw the inset blue ring the rest of the library uses.
		expect(transcript.className).toContain('outline-none')

		expect(transcript.className).toContain('focus-visible:ring-blue-600')
	})

	it('pulses only the last assistant bubble while streaming', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} streaming />)

		// The bubble carries the streaming look and projects the pulse onto its
		// Markdown child, so the marked element is the bubble.
		const pulsing = allBySlot(container, 'chat-message-bubble').filter((el) =>
			el.classList.contains('[&>[data-slot=markdown]]:motion-safe:animate-pulse'),
		)

		expect(pulsing).toHaveLength(1)

		expect(present(pulsing[0], 'streaming bubble')).toHaveTextContent('Hello!')
	})

	describe('the row callbacks', () => {
		it('gives each message the actions that the callback returns for it', () => {
			const { container } = renderUI(
				<ChatTranscript
					messages={messages}
					actions={(message) =>
						message.sender === 'assistant' ? <button type="button">Retry</button> : undefined
					}
				/>,
			)

			const rows = allBySlot(container, 'chat-message')

			expect(bySlot(present(rows[0], 'user row'), 'chat-message-actions')).toBeNull()

			expect(getSlot(present(rows[1], 'assistant row'), 'chat-message-actions')).toContainElement(
				screen.getByRole('button', { name: 'Retry' }),
			)
		})

		it('passes the trigger to each message', () => {
			const { container } = renderUI(
				<ChatTranscript
					messages={messages}
					trigger="static"
					actions={() => <button type="button">Copy</button>}
				/>,
			)

			for (const actions of allBySlot(container, 'chat-message-actions')) {
				expect(actions.className).toContain('mt-1')

				expect(actions.className).not.toContain('absolute')
			}
		})

		it('opens the context menu that the callback returns for a message', () => {
			const onAction = vi.fn()

			const { container } = renderUI(
				<ChatTranscript
					messages={messages}
					contextMenu={(message) =>
						message.sender === 'user' ? [{ key: 'edit', label: 'Edit', onAction }] : undefined
					}
				/>,
			)

			const [own, reply] = allBySlot(container, 'chat-message-bubble')

			// A message with no entries keeps the native menu of the browser.
			expect(fireEvent.contextMenu(present(reply, 'reply bubble'))).toBe(true)

			fireEvent.contextMenu(present(own, 'own bubble'))

			fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

			expect(onAction).toHaveBeenCalledOnce()
		})

		it('keeps room above the first row only for a hover toolbar', () => {
			const actions = () => <button type="button">Copy</button>

			const first = (container: HTMLElement) =>
				present(allBySlot(container, 'chat-transcript-row')[0], 'first row').className

			const hover = renderUI(<ChatTranscript messages={messages} actions={actions} />)

			expect(first(hover.container)).toContain('pt-8')

			hover.unmount()

			const fixed = renderUI(
				<ChatTranscript messages={messages} actions={actions} trigger="static" />,
			)

			expect(first(fixed.container)).toBe('')

			fixed.unmount()

			const bare = renderUI(<ChatTranscript messages={messages} />)

			expect(first(bare.container)).toBe('')
		})

		it('does not render a settled row again when a chunk lands', () => {
			const calls: string[] = []

			function Chat({ reply }: { reply: string }) {
				const actions = useCallback((message: ChatMessageData) => {
					calls.push(message.id ?? '')

					return undefined
				}, [])

				return (
					<ChatTranscript
						messages={[
							messages[0] as ChatMessageData,
							{ id: '2', sender: 'assistant', content: reply },
						]}
						streaming
						actions={actions}
					/>
				)
			}

			const { rerender } = renderUI(<Chat reply="Hel" />)

			calls.length = 0

			rerender(<Chat reply="Hello" />)

			expect(calls).toEqual(['2'])
		})
	})

	describe('the reply a reader cannot see', () => {
		/** A transcript holding the reader's own message, with no reply to it yet. */
		const sent: ChatMessageData[] = [{ id: '1', sender: 'user', content: 'Hi there' }]

		/** That transcript mid-reply, at whatever the bubble holds so far. */
		const arriving = (content: string) => (
			<ChatTranscript messages={[...sent, { id: '2', sender: 'assistant', content }]} streaming />
		)

		/** The same transcript once the reply settled. */
		const settled = (content: string) => (
			<ChatTranscript messages={[...sent, { id: '2', sender: 'assistant', content }]} />
		)

		it('is a log whose own aria-live is off, so the announcer is the only channel', () => {
			// The role says what the region is. Leaving it live as well would put a
			// second channel over one reply and read it twice.
			const { container } = renderUI(<ChatTranscript messages={messages} />)

			const transcript = getSlot(container, 'chat-transcript')

			expect(transcript).toHaveAttribute('role', 'log')

			expect(transcript).toHaveAttribute('aria-live', 'off')
		})

		it('stays silent when it mounts with its history in hand', () => {
			// The announcer creates its region on the first announcement, so no
			// region at all is the proof that a reloaded transcript reads nothing.
			renderUI(<ChatTranscript messages={messages} />)

			expect(liveRegion()).toBeNull()
		})

		it('says a reply started, then says the reply once it settles', async () => {
			const { rerender } = renderUI(<ChatTranscript messages={sent} />)

			expect(liveRegion()).toBeNull()

			rerender(arriving(''))

			await expectAnnouncement('Assistant is replying')

			rerender(settled('Twelve stops are late.'))

			await expectAnnouncement('Twelve stops are late.')
		})

		it('says nothing per chunk while the reply rewrites itself', async () => {
			const { rerender } = renderUI(<ChatTranscript messages={sent} />)

			rerender(arriving('Twelve'))

			await expectAnnouncement('Assistant is replying')

			rerender(arriving('Twelve stops'))

			rerender(arriving('Twelve stops are late.'))

			// Still the start line: no chunk reached the region, and the settled
			// reply has not been spoken because the reply has not settled.
			expect(liveRegion()).toHaveTextContent('Assistant is replying')
		})
	})
})

describe('ChatTranscriptSkeleton', () => {
	it('alternates its bubbles between the user side and the assistant side', () => {
		const { container } = renderUI(<ChatTranscriptSkeleton messages={3} />)

		const root = container.firstElementChild

		expect(root).toHaveAttribute('aria-hidden', 'true')

		const lines = Array.from(
			root?.children ?? [],
			(row) => row.querySelectorAll('[data-slot="placeholder"]').length,
		)

		expect(lines).toStrictEqual([1, 2, 1])
	})
})

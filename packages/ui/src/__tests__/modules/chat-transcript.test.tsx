import { useCallback, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessageData } from '../../modules/chat'
import { ChatTranscript, ChatTranscriptSkeleton } from '../../modules/chat'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	flushAnnouncer,
	getSlot,
	liveRegion,
	present,
	renderUI,
	screen,
	stubMatchMedia,
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

	it('names the log "Conversation", and takes a name of the consumer in its place', () => {
		const { unmount } = renderUI(<ChatTranscript messages={messages} />)

		expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument()

		unmount()

		renderUI(<ChatTranscript messages={messages} aria-label="Support chat" />)

		expect(screen.getByRole('log', { name: 'Support chat' })).toBeInTheDocument()
	})

	it('rings only the message that the composer edits', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} editing="1" />)

		const edited = allBySlot(container, 'chat-message').filter((el) =>
			el.hasAttribute('data-editing'),
		)

		expect(edited).toHaveLength(1)

		expect(present(edited[0], 'edited message')).toHaveTextContent('Hi there')
	})

	it('labels only the message that an edit sent', () => {
		const { container } = renderUI(
			<ChatTranscript
				messages={[
					{ id: '1', sender: 'user', content: 'Hi there', edited: true },
					{ id: '2', sender: 'assistant', content: 'Hello!' },
				]}
			/>,
		)

		const labels = allBySlot(container, 'chat-message-edited')

		expect(labels).toHaveLength(1)

		expect(labels[0]?.closest('[data-slot=chat-message]')).toHaveTextContent('Hi there')
	})

	describe('the row callbacks', () => {
		it('opens the context menu that the callback returns for a message', () => {
			const onAction = vi.fn()

			// The long press of a touch screen opens the menu over the bubble.
			stubMatchMedia((query) => query === NO_HOVER_QUERY)

			const { container } = renderUI(
				<ChatTranscript
					messages={messages}
					contextMenu={(message) =>
						message.sender === 'user'
							? { items: [{ key: 'edit', label: 'Edit', onAction }] }
							: false
					}
				/>,
			)

			const [own, reply] = allBySlot(container, 'chat-message-bubble')

			// A message whose callback returns false keeps the native menu of the browser.
			expect(fireEvent.contextMenu(present(reply, 'reply bubble'))).toBe(true)

			fireEvent.contextMenu(present(own, 'own bubble'))

			expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()

			fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

			expect(onAction).toHaveBeenCalledOnce()
		})

		it('makes each message a row, with the same gap above each, the first too on a device that hovers', () => {
			const { container } = renderUI(<ChatTranscript messages={messages} />)

			const rows = allBySlot(container, 'chat-message')

			// The window measures the message itself, and no box wraps it.
			expect(rows.map((row) => row.dataset.index)).toEqual(['0', '1'])

			// The gap holds the toolbar of the menu button above each bubble.
			for (const row of rows) expect(row).toHaveClass('pt-6')

			// A device with no hover has no toolbar, so the first row keeps only the
			// room of the ring of an edit above it. The gap between rows stays.
			expect(rows[0]).toHaveClass('[@media(hover:none)]:pt-1')

			expect(rows[1]?.className).not.toContain('hover:none')
		})

		it('does not render a settled row again when a chunk lands', () => {
			const calls: string[] = []

			function Chat({ reply }: { reply: string }) {
				const contextMenu = useCallback((message: ChatMessageData) => {
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
						contextMenu={contextMenu}
					/>
				)
			}

			const { rerender } = renderUI(<Chat reply="Hel" />)

			calls.length = 0

			rerender(<Chat reply="Hello" />)

			expect(calls).toEqual(['2'])
		})
	})

	describe('branches', () => {
		const replies = (reply: ChatMessageData): ChatMessageData[] => [
			messages[0] as ChatMessageData,
			reply,
		]

		const first: ChatMessageData = { id: 'r1', sender: 'assistant', content: 'First reply' }

		const second: ChatMessageData = { id: 'r2', sender: 'assistant', content: 'Second reply' }

		it('gives the switcher to the message that the branches name', () => {
			const onBranchChange = vi.fn()

			const { container } = renderUI(
				<ChatTranscript
					messages={replies(second)}
					branches={{ r2: { index: 1, ids: ['r1', 'r2'] } }}
					onBranchChange={onBranchChange}
				/>,
			)

			expect(allBySlot(container, 'chat-message-branch')).toHaveLength(1)

			fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

			expect(onBranchChange).toHaveBeenCalledExactlyOnceWith('r1')
		})

		it('turns each switcher off while a reply streams', () => {
			renderUI(
				<ChatTranscript
					messages={replies(second)}
					branches={{ r2: { index: 1, ids: ['r1', 'r2'] } }}
					onBranchChange={vi.fn()}
					streaming
				/>,
			)

			expect(screen.getByRole('button', { name: 'Previous version' })).toHaveAttribute(
				'aria-disabled',
				'true',
			)
		})

		it('keeps the row and the focus in the switcher across a switch', () => {
			const { rerender } = renderUI(
				<ChatTranscript
					messages={replies(second)}
					branches={{ r2: { index: 1, ids: ['r1', 'r2', 'r3'] } }}
					onBranchChange={vi.fn()}
				/>,
			)

			const previous = screen.getByRole('button', { name: 'Previous version' })

			previous.focus()

			rerender(
				<ChatTranscript
					messages={replies(first)}
					branches={{ r1: { index: 0, ids: ['r1', 'r2', 'r3'] } }}
					onBranchChange={vi.fn()}
				/>,
			)

			expect(screen.getByText('First reply')).toBeInTheDocument()

			// The row of each branch takes the key of the oldest one, so React keeps
			// the button that held the focus.
			expect(previous).toBeInTheDocument()

			expect(previous).toHaveFocus()
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

		describe('a switch of a branch', () => {
			const question = messages[0] as ChatMessageData

			const first: ChatMessageData = { id: 'r1', sender: 'assistant', content: 'First reply' }

			const second: ChatMessageData = { id: 'r2', sender: 'assistant', content: 'Second reply' }

			const ids = ['r1', 'r2']

			/**
			 * A transcript whose last reply has two versions, with a switch that the
			 * owner applies or refuses. With `rebuild`, the owner makes new message
			 * objects on each render, and a field renders the owner again.
			 */
			function Versions({
				refuse = false,
				rebuild = false,
			}: {
				refuse?: boolean
				rebuild?: boolean
			}) {
				const [shown, setShown] = useState<ChatMessageData[]>([question, second])

				const [extra, setExtra] = useState<ChatMessageData[]>([])

				const [, setDraft] = useState('')

				const path = [...shown, ...extra]

				const last = shown.at(-1) as ChatMessageData

				return (
					<>
						<ChatTranscript
							messages={rebuild ? path.map((message) => ({ ...message })) : path}
							branches={{ [last.id as string]: { index: ids.indexOf(last.id as string), ids } }}
							onBranchChange={(id) => {
								if (!refuse) setShown([question, id === 'r1' ? first : second])
							}}
						/>
						<input aria-label="Draft" onChange={(event) => setDraft(event.target.value)} />
						<button
							type="button"
							onClick={() =>
								setExtra([
									{ id: 'q2', sender: 'user', content: 'And the next?' },
									{ id: 'r3', sender: 'assistant', content: 'Three more are late.' },
								])
							}
						>
							Reply
						</button>
						<button
							type="button"
							onClick={() => {
								setExtra([])

								setShown([question, first])
							}}
						>
							Show first
						</button>
					</>
				)
			}

			it('speaks the new position, and not the reply that the switch shows', async () => {
				renderUI(<Versions />)

				fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

				await expectAnnouncement('Version 1 of 2')

				await flushAnnouncer()

				expect(liveRegion()).not.toHaveTextContent('First reply')

				// The hold ends with the switch: the next reply speaks.
				fireEvent.click(screen.getByRole('button', { name: 'Reply' }))

				await expectAnnouncement('Three more are late.')
			})

			it('keeps the hold when the owner makes new message objects on each render', async () => {
				renderUI(<Versions rebuild />)

				fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

				await expectAnnouncement('Version 1 of 2')

				// A keystroke renders the owner again, with new objects and the same text.
				fireEvent.change(screen.getByRole('textbox', { name: 'Draft' }), {
					target: { value: 'a' },
				})

				await flushAnnouncer()

				expect(liveRegion()).not.toHaveTextContent('First reply')
			})

			it('ends a refused hold, so a later path of the owner speaks no hidden version', async () => {
				renderUI(<Versions refuse />)

				fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

				fireEvent.click(screen.getByRole('button', { name: 'Reply' }))

				await expectAnnouncement('Three more are late.')

				// The owner shows the first version by its own control. The armed hold
				// ended with the reply, so the hold does not bind to the old status.
				fireEvent.click(screen.getByRole('button', { name: 'Show first' }))

				await expectAnnouncement('First reply')

				expect(liveRegion()).not.toHaveTextContent('Second reply')
			})

			it('speaks nothing when the owner refuses the switch', async () => {
				renderUI(<Versions refuse />)

				const before = liveRegion()?.textContent

				fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

				await flushAnnouncer()

				expect(liveRegion()?.textContent).toBe(before)

				// A refused switch leaves no hold, so the next reply speaks.
				fireEvent.click(screen.getByRole('button', { name: 'Reply' }))

				await expectAnnouncement('Three more are late.')
			})
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

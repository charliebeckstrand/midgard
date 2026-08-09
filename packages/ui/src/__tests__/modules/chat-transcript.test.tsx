import { describe, expect, it } from 'vitest'
import type { ChatMessageData } from '../../modules/chat'
import { ChatTranscript } from '../../modules/chat'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	liveRegion,
	present,
	renderUI,
	screen,
} from '../helpers'

const messages: ChatMessageData[] = [
	{ id: '1', role: 'user', content: 'Hi there' },
	{ id: '2', role: 'assistant', content: 'Hello!' },
]

describe('ChatTranscript', () => {
	it('renders each message, passing its role straight to the bubble', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} />)

		expect(screen.getByText('Hi there')).toBeInTheDocument()

		expect(screen.getByText('Hello!')).toBeInTheDocument()

		const bubbles = allBySlot(container, 'chat-message')

		expect(present(bubbles[0], 'user bubble')).toHaveAttribute('data-role', 'user')

		expect(present(bubbles[1], 'assistant bubble')).toHaveAttribute('data-role', 'assistant')
	})

	it('renders nothing in the list when there are no messages', () => {
		const { container } = renderUI(<ChatTranscript messages={[]} />)

		expect(allBySlot(container, 'chat-message')).toHaveLength(0)

		expect(bySlot(container, 'chat-transcript')).toBeInTheDocument()
	})

	it('signals keyboard focus with the design-system ring, not the browser default', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} />)

		const transcript = present(bySlot(container, 'chat-transcript'), 'transcript')

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

	describe('the reply a reader cannot see', () => {
		/** A transcript holding the reader's own message, with no reply to it yet. */
		const sent: ChatMessageData[] = [{ id: '1', role: 'user', content: 'Hi there' }]

		/** That transcript mid-reply, at whatever the bubble holds so far. */
		const arriving = (content: string) => (
			<ChatTranscript messages={[...sent, { id: '2', role: 'assistant', content }]} streaming />
		)

		/** The same transcript once the reply settled. */
		const settled = (content: string) => (
			<ChatTranscript messages={[...sent, { id: '2', role: 'assistant', content }]} />
		)

		it('is a log whose own aria-live is off, so the announcer is the only channel', () => {
			// The role says what the region is. Leaving it live as well would put a
			// second channel over one reply and read it twice.
			const { container } = renderUI(<ChatTranscript messages={messages} />)

			const transcript = present(bySlot(container, 'chat-transcript'), 'transcript')

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

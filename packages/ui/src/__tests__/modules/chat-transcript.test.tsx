import { describe, expect, it } from 'vitest'
import type { ChatContent } from '../../modules/chat'
import { ChatTranscript } from '../../modules/chat'
import { allBySlot, bySlot, present, renderUI, screen } from '../helpers'

const messages: ChatContent[] = [
	{ id: '1', role: 'user', content: 'Hi there' },
	{ id: '2', role: 'agent', content: 'Hello!' },
]

describe('ChatTranscript', () => {
	it('renders each message, mapping agent role to an assistant bubble', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} />)

		expect(screen.getByText('Hi there')).toBeInTheDocument()

		expect(screen.getByText('Hello!')).toBeInTheDocument()

		const bubbles = allBySlot(container, 'chat-message')

		expect(present(bubbles[0], 'user bubble')).toHaveAttribute('data-type', 'user')

		expect(present(bubbles[1], 'assistant bubble')).toHaveAttribute('data-type', 'assistant')
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

	it('pulses only the last agent bubble while streaming', () => {
		const { container } = renderUI(<ChatTranscript messages={messages} streaming />)

		const pulsing = allBySlot(container, 'markdown').filter((el) =>
			el.classList.contains('animate-pulse'),
		)

		expect(pulsing).toHaveLength(1)

		expect(present(pulsing[0], 'streaming bubble')).toHaveTextContent('Hello!')
	})
})

// jsdom has no layout; react-virtual sees a 0-height scroll container and
// renders (at most) the overscan window. These tests assert boundedness and
// structure; real windowing geometry is covered by the browser suite
// (`__tests__/browser/virtualization.test.tsx`).

describe('ChatTranscript virtualize', () => {
	const many: ChatContent[] = Array.from({ length: 500 }, (_, i) => ({
		id: String(i),
		role: i % 2 === 0 ? 'user' : 'agent',
		content: `Message ${i}`,
	}))

	it('renders the transcript slot as its own scroll container', () => {
		const { container } = renderUI(<ChatTranscript messages={many} virtualize />)

		const transcript = present(bySlot(container, 'chat-transcript'), 'transcript')

		expect(transcript.className).toContain('overflow-y-auto')
	})

	it('never mounts more bubbles than the transcript holds', () => {
		const { container } = renderUI(<ChatTranscript messages={many} virtualize />)

		expect(allBySlot(container, 'chat-message').length).toBeLessThanOrEqual(many.length)
	})

	it('accepts windowing knobs as an options object', () => {
		const { container } = renderUI(
			<ChatTranscript messages={many} virtualize={{ estimateSize: 48, overscan: 4 }} />,
		)

		expect(bySlot(container, 'chat-transcript')).toBeInTheDocument()
	})

	it('renders every message when virtualization stays off', () => {
		const { container } = renderUI(<ChatTranscript messages={many.slice(0, 40)} />)

		expect(allBySlot(container, 'chat-message')).toHaveLength(40)
	})
})

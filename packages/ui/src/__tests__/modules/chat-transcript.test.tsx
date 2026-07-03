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

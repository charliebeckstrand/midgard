import { describe, expect, it } from 'vitest'
import type { ChatContent } from '../../modules/chat'
import { ChatMessages } from '../../modules/chat'
import { allBySlot, bySlot, present, renderUI, screen } from '../helpers'

const messages: ChatContent[] = [
	{ id: '1', role: 'user', content: 'Hi there' },
	{ id: '2', role: 'agent', content: 'Hello!' },
]

describe('ChatMessages', () => {
	it('renders each message, mapping agent role to an assistant bubble', () => {
		const { container } = renderUI(<ChatMessages messages={messages} />)

		expect(screen.getByText('Hi there')).toBeInTheDocument()

		expect(screen.getByText('Hello!')).toBeInTheDocument()

		const bubbles = allBySlot(container, 'chat-message')

		expect(present(bubbles[0], 'user bubble')).toHaveAttribute('data-type', 'user')

		expect(present(bubbles[1], 'assistant bubble')).toHaveAttribute('data-type', 'assistant')
	})

	it('renders nothing in the list when there are no messages', () => {
		const { container } = renderUI(<ChatMessages messages={[]} />)

		expect(allBySlot(container, 'chat-message')).toHaveLength(0)

		expect(bySlot(container, 'chat-messages')).toBeInTheDocument()
	})

	it('pulses only the last agent bubble while streaming', () => {
		const { container } = renderUI(<ChatMessages messages={messages} streaming />)

		const pulsing = allBySlot(container, 'markdown').filter((el) =>
			el.classList.contains('animate-pulse'),
		)

		expect(pulsing).toHaveLength(1)

		expect(present(pulsing[0], 'streaming bubble')).toHaveTextContent('Hello!')
	})
})

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChatMessageData } from '../../modules/chat'
import { useChatTranscriptItemKey } from '../../modules/chat/use-chat-transcript-item-key'

const history: ChatMessageData[] = [
	{ id: 'a', role: 'user', content: 'Where are the late stops?' },
	{ id: 'b', role: 'assistant', content: 'On the north route.' },
	{ id: 'c', role: 'user', content: 'Since when?' },
]

const withReply = (content: string, id = 'reply'): ChatMessageData[] => [
	...history,
	{ id, role: 'assistant', content },
]

function mount(messages: ChatMessageData[]) {
	return renderHook(
		(props: { messages: ChatMessageData[] }) => useChatTranscriptItemKey(props.messages),
		{ initialProps: { messages } },
	)
}

describe('useChatTranscriptItemKey', () => {
	it('keeps one identity across streamed chunks', () => {
		const { result, rerender } = mount(withReply(''))

		const first = result.current

		rerender({ messages: withReply('Late') })

		rerender({ messages: withReply('Late stops rose') })

		// A new identity makes the virtualizer rebuild the position of every row.
		expect(result.current).toBe(first)

		expect(result.current(3)).toBe('reply')
	})

	it('takes a new identity when an id changes and the count does not', () => {
		const { result, rerender } = mount(withReply('Late'))

		const first = result.current

		// The server confirms the reply, and its id changes in place.
		rerender({ messages: withReply('Late', 'server-1') })

		expect(result.current).not.toBe(first)

		expect(result.current(3)).toBe('server-1')
	})

	it('takes a new identity when the messages change order', () => {
		const [a, b, c] = history as [ChatMessageData, ChatMessageData, ChatMessageData]

		const { result, rerender } = mount([a, b, c])

		const first = result.current

		rerender({ messages: [b, a, c] })

		expect(result.current).not.toBe(first)

		expect(result.current(0)).toBe('b')
	})

	it('takes a new identity when a message is added', () => {
		const { result, rerender } = mount(history)

		const first = result.current

		rerender({ messages: withReply('') })

		expect(result.current).not.toBe(first)

		expect(result.current(3)).toBe('reply')
	})

	it('falls back to the index for a message with no id', () => {
		const { result } = mount([{ role: 'user', content: 'No id' }])

		expect(result.current(0)).toBe(0)
	})
})

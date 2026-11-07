import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChatBranch, ChatMessageData } from '../../modules/chat'
import { useChatTranscriptItemKey } from '../../modules/chat/use-chat-transcript-item-key'

const history: ChatMessageData[] = [
	{ id: 'a', sender: 'user', content: 'Where are the late stops?' },
	{ id: 'b', sender: 'assistant', content: 'On the north route.' },
	{ id: 'c', sender: 'user', content: 'Since when?' },
]

const withReply = (content: string, id = 'reply'): ChatMessageData[] => [
	...history,
	{ id, sender: 'assistant', content },
]

/** The props of the hook under test. */
type Props = { messages: ChatMessageData[]; branches?: Record<string, ChatBranch> }

function mount(messages: ChatMessageData[], branches?: Record<string, ChatBranch>) {
	return renderHook((props: Props) => useChatTranscriptItemKey(props.messages, props.branches), {
		initialProps: { messages, branches } as Props,
	})
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
		const { result } = mount([{ sender: 'user', content: 'No id' }])

		expect(result.current(0)).toBe(0)
	})

	// The engine reads an empty id as no id, so the key does too. Otherwise two
	// messages with `id: ''` share a React key.
	it('keys a message with an empty id by its index', () => {
		const { result } = mount([
			{ id: '', sender: 'user', content: 'Where are the late stops?' },
			{ id: '', sender: 'assistant', content: 'On the north route.' },
		])

		expect([result.current(0), result.current(1)]).toEqual([0, 1])
	})

	it('keys a message with branches by its oldest branch, so a switch keeps the row', () => {
		const branches = (index: number, ids: string[]) => ({
			[ids[index] as string]: { index, ids },
		})

		const { result, rerender } = mount(withReply('Second', 'r2'), branches(1, ['r1', 'r2']))

		const first = result.current

		expect(result.current(3)).toBe('r1')

		rerender({ messages: withReply('First', 'r1'), branches: branches(0, ['r1', 'r2']) })

		expect(result.current(3)).toBe('r1')

		expect(result.current).toBe(first)
	})
})

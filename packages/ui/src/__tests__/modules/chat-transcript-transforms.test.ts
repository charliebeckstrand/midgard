import { describe, expect, it } from 'vitest'
import {
	appendUserMessage,
	applyReplySnapshot,
	dropEmptyReply,
	lastUserMessage,
	openReply,
	truncateToEditedMessage,
	truncateToLastUserMessage,
	userMessage,
} from '../../modules/chat/engine/chat-transcript'
import type { ChatContent } from '../../modules/chat/engine/types'

const user = (id: string, content: string): ChatContent => ({ id, role: 'user', content })

const assistant = (id: string, content: string): ChatContent => ({ id, role: 'assistant', content })

describe('appendUserMessage', () => {
	it('appends the message under the id the caller supplies', () => {
		expect(appendUserMessage([], 'u1', 'hi')).toEqual([user('u1', 'hi')])
	})

	it('keeps the transcript before it', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'hello')]

		expect(appendUserMessage(messages, 'u2', 'again')).toEqual([...messages, user('u2', 'again')])
	})

	it('returns a new list', () => {
		const messages = [user('u1', 'hi')]

		expect(appendUserMessage(messages, 'u2', 'again')).not.toBe(messages)

		expect(messages).toHaveLength(1)
	})
})

describe('openReply', () => {
	it('appends an empty assistant bubble under the id', () => {
		expect(openReply([user('u1', 'hi')], 'r1')).toEqual([user('u1', 'hi'), assistant('r1', '')])
	})
})

describe('applyReplySnapshot', () => {
	it('replaces the named reply’s content, because a snapshot is cumulative', () => {
		const opened = openReply([user('u1', 'hi')], 'r1')

		const first = applyReplySnapshot(opened, 'r1', 'Hel')

		expect(applyReplySnapshot(first, 'r1', 'Hello')).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'Hello'),
		])
	})

	it('leaves every other message alone', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', ''),
		]

		expect(applyReplySnapshot(messages, 'r2', 'second')).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'second'),
		])
	})

	it('changes nothing for an id that names no message', () => {
		const messages = [user('u1', 'hi'), assistant('r1', '')]

		expect(applyReplySnapshot(messages, 'absent', 'Hello')).toEqual(messages)
	})
})

describe('dropEmptyReply', () => {
	it('drops the reply the id names while it is empty', () => {
		expect(dropEmptyReply([user('u1', 'hi'), assistant('r1', '')], 'r1')).toEqual([
			user('u1', 'hi'),
		])
	})

	it('keeps a reply that received content', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'partial')]

		expect(dropEmptyReply(messages, 'r1')).toEqual(messages)
	})

	it('keeps an empty bubble another send opened', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', ''),
			user('u2', 'again'),
			assistant('r2', ''),
		]

		expect(dropEmptyReply(messages, 'r2')).toEqual([
			user('u1', 'hi'),
			assistant('r1', ''),
			user('u2', 'again'),
		])
	})

	it('drops nothing for an id that opened no reply', () => {
		const messages = [user('u1', 'hi')]

		expect(dropEmptyReply(messages, 'r1')).toEqual(messages)
	})
})

describe('lastUserMessage', () => {
	it('reads the last user message, past a later reply', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'x'),
		]

		expect(lastUserMessage(messages)).toEqual(user('u2', 'again'))
	})

	it('is undefined when the transcript holds no user message', () => {
		expect(lastUserMessage([assistant('r1', 'unprompted')])).toBeUndefined()
	})
})

describe('truncateToLastUserMessage', () => {
	it('keeps the last user message and drops its reply', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'first')]

		expect(truncateToLastUserMessage(messages)).toEqual([user('u1', 'hi')])
	})

	it('drops every turn after the last user message', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'x'),
		]

		expect(truncateToLastUserMessage(messages)).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
		])
	})

	it('changes nothing when the last user message has no reply yet', () => {
		const messages = [user('u1', 'hi')]

		expect(truncateToLastUserMessage(messages)).toEqual(messages)
	})

	it('changes nothing when the transcript holds no user message', () => {
		const messages = [assistant('r1', 'unprompted')]

		expect(truncateToLastUserMessage(messages)).toEqual(messages)
	})
})

describe('userMessage', () => {
	it('reads the user message the id names', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'first')]

		expect(userMessage(messages, 'u1')).toEqual(user('u1', 'hi'))
	})

	it('is undefined for a reply’s id, so only a user message is editable', () => {
		expect(userMessage([user('u1', 'hi'), assistant('r1', 'first')], 'r1')).toBeUndefined()
	})

	it('is undefined for an id the transcript does not hold', () => {
		expect(userMessage([user('u1', 'hi')], 'absent')).toBeUndefined()
	})
})

describe('truncateToEditedMessage', () => {
	it('replaces the message’s content and drops every turn after it', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'x'),
		]

		expect(truncateToEditedMessage(messages, 'u1', 'edited')).toEqual([user('u1', 'edited')])
	})

	it('keeps the message’s other fields', () => {
		const messages: ChatContent[] = [
			{ id: 'u1', role: 'user', content: 'hi', timestamp: '2026-08-08T00:00:00Z' },
			assistant('r1', 'first'),
		]

		expect(truncateToEditedMessage(messages, 'u1', 'edited')).toEqual([
			{ id: 'u1', role: 'user', content: 'edited', timestamp: '2026-08-08T00:00:00Z' },
		])
	})

	it('changes nothing for an id that names no message', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'first')]

		expect(truncateToEditedMessage(messages, 'absent', 'edited')).toEqual(messages)
	})

	it('returns a new list, leaving the transcript it read intact', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'first')]

		expect(truncateToEditedMessage(messages, 'u1', 'edited')).not.toBe(messages)

		expect(messages[0]).toEqual(user('u1', 'hi'))
	})
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { chatBranches, toChatTree } from '../../modules/chat/engine/chat-branch/tree'
import type { ChatPart } from '../../modules/chat/engine/chat-content/types'
import {
	appendUserMessage,
	applyReplyChunk,
	branchEditedMessage,
	branchLastReply,
	dropEmptyReply,
	duplicateMessageIds,
	failReply,
	failReplyTools,
	findLastUserMessage,
	findUserMessage,
	openReply,
	seedMessages,
} from '../../modules/chat/engine/chat-transcript'
import type { ChatMessageData } from '../../modules/chat/engine/types'

const user = (id: string, content: string): ChatMessageData => ({ id, sender: 'user', content })

const assistant = (id: string, content: string): ChatMessageData => ({
	id,
	sender: 'assistant',
	content,
})

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

describe('applyReplyChunk', () => {
	it('replaces the named reply’s prose, because a string chunk is cumulative', () => {
		const opened = openReply([user('u1', 'hi')], 'r1')

		const first = applyReplyChunk(opened, 'r1', 'Hel')

		expect(applyReplyChunk(first, 'r1', 'Hello')).toEqual([
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

		expect(applyReplyChunk(messages, 'r2', 'second')).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'second'),
		])
	})

	it('changes nothing for an id that names no message', () => {
		const messages = [user('u1', 'hi'), assistant('r1', '')]

		expect(applyReplyChunk(messages, 'absent', 'Hello')).toEqual(messages)
	})

	it('folds a part chunk into the named reply, and leaves the rest alone', () => {
		// The transform finds the reply; `applyChunk` decides what the chunk means
		// to the content it lands in. This states only the first half.
		const chart: ChatPart = { kind: 'embed', id: 'e1', name: 'stops-map', data: null }

		const messages = [user('u1', 'hi'), assistant('r1', 'first'), assistant('r2', '')]

		expect(applyReplyChunk(messages, 'r2', [chart])).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			{ id: 'r2', sender: 'assistant', content: [chart] },
		])
	})
})

describe('failReplyTools', () => {
	const step = (status: 'running' | 'done' | 'failed', id = 't1'): ChatPart => ({
		kind: 'tool',
		id,
		label: 'Filter shipments',
		status,
	})

	const replyHolding = (...parts: ChatPart[]): ChatMessageData[] => [
		user('u1', 'hi'),
		{ id: 'r1', sender: 'assistant', content: parts },
	]

	it('marks a step still running as failed', () => {
		// The rule that lets a `tool` block carry a running status at all: nothing
		// else stops the spinner when the stream ends without settling it.
		expect(failReplyTools(replyHolding(step('running')), 'r1')).toEqual(
			replyHolding(step('failed')),
		)
	})

	it('leaves a settled step alone', () => {
		const messages = replyHolding(step('done'), step('failed', 't2'))

		expect(failReplyTools(messages, 'r1')).toBe(messages)
	})

	it('settles every running step, and touches nothing beside them', () => {
		const messages = replyHolding(
			{ kind: 'text', id: 'x', text: 'Working.' },
			step('running'),
			step('done', 't2'),
			step('running', 't3'),
		)

		expect(failReplyTools(messages, 'r1')).toEqual(
			replyHolding(
				{ kind: 'text', id: 'x', text: 'Working.' },
				step('failed'),
				step('done', 't2'),
				step('failed', 't3'),
			),
		)
	})

	it('returns the transcript by reference when it settled nothing', () => {
		// The shell runs this on every send, so the common case (a reply of prose)
		// must cost no re-render.
		const messages = [user('u1', 'hi'), assistant('r1', 'Twelve stops are late.')]

		expect(failReplyTools(messages, 'r1')).toBe(messages)
	})

	it('changes nothing for an id that names no message', () => {
		const messages = replyHolding(step('running'))

		expect(failReplyTools(messages, 'absent')).toBe(messages)
	})

	it('leaves a running step in another reply alone', () => {
		const messages: ChatMessageData[] = [
			{ id: 'r0', sender: 'assistant', content: [step('running')] },
			{ id: 'r1', sender: 'assistant', content: [step('running', 't2')] },
		]

		expect(failReplyTools(messages, 'r1')[0]?.content).toEqual([step('running')])
	})
})

describe('failReply', () => {
	it('marks the reply the id names failed, and keeps what it landed', () => {
		expect(failReply([user('u1', 'hi'), assistant('r1', 'partial')], 'r1')).toEqual([
			user('u1', 'hi'),
			{ ...assistant('r1', 'partial'), failed: true },
		])
	})

	it('adds an empty failed reply when the reply never opened', () => {
		expect(failReply([user('u1', 'hi')], 'r1')).toEqual([
			user('u1', 'hi'),
			{ ...assistant('r1', ''), failed: true },
		])
	})

	it('leaves every other message alone', () => {
		const earlier = assistant('r0', 'done')

		const [first] = failReply([earlier, user('u1', 'hi'), assistant('r1', '')], 'r1')

		expect(first).toBe(earlier)
	})
})

describe('dropEmptyReply', () => {
	it('keeps an empty reply that failed, because it says that the send failed', () => {
		const messages = [user('u1', 'hi'), { ...assistant('r1', ''), failed: true }]

		expect(dropEmptyReply(messages, 'r1')).toEqual(messages)
	})

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

	// The settle runs on every exit of a send, so a list that drops nothing keeps
	// its identity and costs no re-render.
	it('returns the transcript by reference when it drops nothing', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'Late stops rose')]

		expect(dropEmptyReply(messages, 'r1')).toBe(messages)
	})
})

describe('findLastUserMessage', () => {
	it('reads the last user message, past a later reply', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'x'),
		]

		expect(findLastUserMessage(messages)).toEqual(user('u2', 'again'))
	})

	it('is undefined when the transcript holds no user message', () => {
		expect(findLastUserMessage([assistant('r1', 'unprompted')])).toBeUndefined()
	})
})

describe('branchLastReply', () => {
	it('hides the reply to the last user message as a branch', () => {
		const tree = branchLastReply(toChatTree([user('u1', 'hi'), assistant('r1', 'first')]))

		expect(tree.path).toEqual([user('u1', 'hi')])

		expect(tree.forks).toEqual({ u1: { before: [[assistant('r1', 'first')]], after: [] } })
	})

	it('hides every turn after the last user message', () => {
		const messages = [
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
			assistant('r2', 'x'),
		]

		expect(branchLastReply(toChatTree(messages)).path).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2', 'again'),
		])
	})

	it('gives the next reply the newest branch, beside the old one', () => {
		const tree = branchLastReply(toChatTree([user('u1', 'hi'), assistant('r1', 'first')]))

		const retried = { ...tree, path: openReply(tree.path, 'r2') }

		expect(chatBranches(retried)).toEqual({ r2: { index: 1, ids: ['r1', 'r2'] } })
	})

	it('changes nothing when the last user message has no reply yet', () => {
		const tree = toChatTree([user('u1', 'hi')])

		expect(branchLastReply(tree)).toBe(tree)
	})

	it('changes nothing when the transcript holds no user message', () => {
		const tree = toChatTree([assistant('r1', 'unprompted')])

		expect(branchLastReply(tree)).toBe(tree)
	})
})

describe('findUserMessage', () => {
	it('reads the user message the id names', () => {
		const messages = [user('u1', 'hi'), assistant('r1', 'first')]

		expect(findUserMessage(messages, 'u1')).toEqual(user('u1', 'hi'))
	})

	it('is undefined for a reply’s id, so only a user message is editable', () => {
		expect(findUserMessage([user('u1', 'hi'), assistant('r1', 'first')], 'r1')).toBeUndefined()
	})

	it('is undefined for an id the transcript does not hold', () => {
		expect(findUserMessage([user('u1', 'hi')], 'absent')).toBeUndefined()
	})
})

describe('branchEditedMessage', () => {
	const messages = [
		user('u1', 'hi'),
		assistant('r1', 'first'),
		user('u2', 'again'),
		assistant('r2', 'x'),
	]

	it('shows the new content under the new id, with no turn after it', () => {
		expect(branchEditedMessage(toChatTree(messages), 'u2', 'u2b', 'edited').path).toEqual([
			user('u1', 'hi'),
			assistant('r1', 'first'),
			user('u2b', 'edited'),
		])
	})

	it('hides the old message and every turn after it as a branch', () => {
		const tree = branchEditedMessage(toChatTree(messages), 'u1', 'u1b', 'edited')

		expect(tree.forks).toEqual({ '': { before: [messages], after: [] } })

		expect(chatBranches(tree)).toEqual({ u1b: { index: 1, ids: ['u1', 'u1b'] } })
	})

	it('changes nothing for an id that names no message', () => {
		const tree = toChatTree(messages)

		expect(branchEditedMessage(tree, 'absent', 'b', 'edited')).toBe(tree)
	})

	it('leaves the tree it read intact', () => {
		const tree = toChatTree(messages)

		branchEditedMessage(tree, 'u1', 'u1b', 'edited')

		expect(tree.path).toEqual(messages)
	})
})

describe('seedMessages', () => {
	/** Names each message the rule assigns an id, in order. */
	function mintIds(): () => string {
		let next = 0

		return () => `minted-${++next}`
	}

	it('keeps the id a message carries, so a persisted id survives the mount', () => {
		const messages = [user('server-1', 'hi'), assistant('server-2', 'hello')]

		expect(seedMessages(messages, mintIds()).map((message) => message.id)).toEqual([
			'server-1',
			'server-2',
		])
	})

	it('returns a message that carries an id by reference, allocating nothing', () => {
		const messages = [user('server-1', 'hi')]

		expect(seedMessages(messages, mintIds())[0]).toBe(messages[0])
	})

	it('assigns an id only to the message that carries none', () => {
		const messages: ChatMessageData[] = [
			user('server-1', 'hi'),
			{ sender: 'assistant', content: 'hello' },
		]

		expect(seedMessages(messages, mintIds()).map((message) => message.id)).toEqual([
			'server-1',
			'minted-1',
		])
	})

	it('mints once per message that carries none, so two never share an id', () => {
		const messages: ChatMessageData[] = [
			{ sender: 'user', content: 'hi' },
			{ sender: 'assistant', content: 'hello' },
		]

		expect(seedMessages(messages, mintIds()).map((message) => message.id)).toEqual([
			'minted-1',
			'minted-2',
		])
	})

	it('reads an empty id as no id, the rule duplicateMessageIds reads', () => {
		const messages: ChatMessageData[] = [{ id: '', sender: 'user', content: 'hi' }]

		expect(seedMessages(messages, mintIds())[0]?.id).toBe('minted-1')
	})

	it('leaves the transcript it read intact', () => {
		const messages: ChatMessageData[] = [{ sender: 'user', content: 'hi' }]

		expect(seedMessages(messages, mintIds())).not.toBe(messages)

		expect(messages[0]?.id).toBeUndefined()
	})
})

describe('duplicateMessageIds', () => {
	it('reports nothing when every message names itself', () => {
		expect(duplicateMessageIds([user('u1', 'hi'), assistant('r1', 'first')])).toEqual([])
	})

	it('reports the id two messages share', () => {
		expect(duplicateMessageIds([user('u1', 'hi'), assistant('u1', 'first')])).toEqual(['u1'])
	})

	it('reports an id once, whatever the count', () => {
		expect(
			duplicateMessageIds([user('u1', 'hi'), assistant('u1', 'first'), user('u1', 'again')]),
		).toEqual(['u1'])
	})

	it('reports each shared id, in the order a second message claims it', () => {
		const messages = [
			user('u2', 'hi'),
			user('u1', 'hello'),
			assistant('u1', 'first'),
			assistant('u2', 'second'),
		]

		expect(duplicateMessageIds(messages)).toEqual(['u1', 'u2'])
	})

	it('skips a message with no id, because the shell assigns it one', () => {
		const messages: ChatMessageData[] = [
			{ sender: 'user', content: 'hi' },
			{ sender: 'assistant', content: 'first' },
		]

		expect(duplicateMessageIds(messages)).toEqual([])
	})

	it('reads an empty id as no id, matching the rule the seeding reads', () => {
		const messages: ChatMessageData[] = [
			{ id: '', sender: 'user', content: 'hi' },
			{ id: '', sender: 'assistant', content: 'first' },
		]

		expect(duplicateMessageIds(messages)).toEqual([])
	})
})

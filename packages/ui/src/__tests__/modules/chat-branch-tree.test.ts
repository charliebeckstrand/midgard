// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	addBranch,
	chatBranches,
	sameBranches,
	showBranch,
	showNewestBranch,
	toChatTree,
	withPath,
} from '../../modules/chat/engine/chat-branch/tree'
import type { ChatTree } from '../../modules/chat/engine/chat-branch/types'
import type { ChatMessageData } from '../../modules/chat/engine/types'

const user = (id: string): ChatMessageData => ({ id, sender: 'user', content: id })

const assistant = (id: string): ChatMessageData => ({ id, sender: 'assistant', content: id })

const ids = (tree: ChatTree) => tree.path.map((message) => message.id)

/** The tree with `messages` at the end of the path. */
const append = (tree: ChatTree, ...messages: ChatMessageData[]) =>
	withPath(tree, [...tree.path, ...messages])

/** u1, r1b, u3, r3 show. r1, u2, r2 hide as the older branch at the place of r1b. */
function forked() {
	const linear = toChatTree([user('u1'), assistant('r1'), user('u2'), assistant('r2')])

	return append(addBranch(linear, 1, assistant('r1b')), user('u3'), assistant('r3'))
}

describe('toChatTree', () => {
	it('shows the list as its path, with no branch', () => {
		const messages = [user('u1'), assistant('r1')]

		const tree = toChatTree(messages)

		expect(tree.path).toBe(messages)

		expect(chatBranches(tree)).toEqual({})
	})
})

describe('withPath', () => {
	it('returns the tree by reference for the path it holds', () => {
		const tree = forked()

		expect(withPath(tree, tree.path)).toBe(tree)
	})

	it('keeps the forks for a new path', () => {
		const tree = forked()

		expect(withPath(tree, [...tree.path]).forks).toBe(tree.forks)
	})
})

describe('addBranch', () => {
	it('hides the messages from the index as a branch, and shows the message', () => {
		const tree = forked()

		expect(ids(tree)).toEqual(['u1', 'r1b', 'u3', 'r3'])

		expect(chatBranches(tree)).toEqual({ r1b: { index: 1, ids: ['r1', 'r1b'] } })
	})

	it('adds a branch at the start of the transcript', () => {
		const tree = addBranch(toChatTree([user('u1'), assistant('r1')]), 0, user('u1b'))

		expect(ids(tree)).toEqual(['u1b'])

		expect(chatBranches(tree)).toEqual({ u1b: { index: 1, ids: ['u1', 'u1b'] } })
	})

	it('shows no branch at the place without a message, until the next one lands', () => {
		const hidden = addBranch(forked(), 1)

		expect(ids(hidden)).toEqual(['u1'])

		expect(chatBranches(hidden)).toEqual({})

		expect(chatBranches(append(hidden, assistant('r1c')))).toEqual({
			r1c: { index: 2, ids: ['r1', 'r1b', 'r1c'] },
		})
	})

	it('hides nothing at the end of the path', () => {
		const tree = forked()

		expect(addBranch(tree, tree.path.length)).toBe(tree)

		expect(ids(addBranch(tree, tree.path.length, user('u4')))).toEqual([
			'u1',
			'r1b',
			'u3',
			'r3',
			'u4',
		])
	})
})

describe('showBranch', () => {
	it('shows the branch the id names, with each turn below it as the reader left it', () => {
		const tree = showBranch(forked(), 'r1')

		expect(ids(tree)).toEqual(['u1', 'r1', 'u2', 'r2'])

		expect(chatBranches(tree)).toEqual({ r1: { index: 0, ids: ['r1', 'r1b'] } })

		expect(ids(showBranch(tree, 'r1b'))).toEqual(['u1', 'r1b', 'u3', 'r3'])
	})

	it('keeps a fork below a branch that hides, for when the branch shows again', () => {
		// A retry of u2 under r1, then an edit of u1 hides all of it.
		const retried = append(addBranch(showBranch(forked(), 'r1'), 3), assistant('r2b'))

		const edited = addBranch(retried, 0, user('u1b'))

		expect(chatBranches(edited)).toEqual({ u1b: { index: 1, ids: ['u1', 'u1b'] } })

		const back = showBranch(edited, 'u1')

		expect(ids(back)).toEqual(['u1', 'r1', 'u2', 'r2b'])

		expect(chatBranches(back)).toEqual({
			u1: { index: 0, ids: ['u1', 'u1b'] },
			r1: { index: 0, ids: ['r1', 'r1b'] },
			r2b: { index: 1, ids: ['r2', 'r2b'] },
		})
	})

	it('changes nothing for the branch that shows', () => {
		const tree = forked()

		expect(showBranch(tree, 'r1b')).toBe(tree)
	})

	it('changes nothing for an id that names no branch of the shown path', () => {
		const tree = forked()

		expect(showBranch(tree, 'absent')).toBe(tree)

		// u2 is below the hidden branch, and it starts no branch.
		expect(showBranch(tree, 'u2')).toBe(tree)
	})
})

describe('showNewestBranch', () => {
	it('shows the newest branch where the path ends at a fork', () => {
		const hidden = addBranch(forked(), 1)

		const shown = showNewestBranch(hidden)

		expect(ids(shown)).toEqual(['u1', 'r1b', 'u3', 'r3'])

		expect(chatBranches(shown)).toEqual({ r1b: { index: 1, ids: ['r1', 'r1b'] } })
	})

	it('removes the fork when its last hidden branch shows', () => {
		const hidden = addBranch(toChatTree([user('u1'), assistant('r1')]), 1)

		expect(showNewestBranch(hidden).forks).toEqual({})

		expect(ids(showNewestBranch(hidden))).toEqual(['u1', 'r1'])
	})

	it('changes nothing where a branch shows', () => {
		const tree = forked()

		expect(showNewestBranch(tree)).toBe(tree)
	})
})

describe('sameBranches', () => {
	it('reads the content, and not the identity', () => {
		const tree = forked()

		expect(sameBranches(chatBranches(tree), chatBranches(tree))).toBe(true)

		expect(sameBranches(chatBranches(tree), chatBranches(showBranch(tree, 'r1')))).toBe(false)

		expect(sameBranches(chatBranches(tree), {})).toBe(false)
	})
})

/**
 * The rules over a transcript with branches: the branches on the shown path,
 * and the changes that hide one branch and show another. A rule over a message
 * list acts on the path through {@link withPath}, so the list rules of
 * `chat-transcript.ts` need no tree of their own.
 *
 * Each fork is keyed by the id of the message before its place. The rules
 * therefore read an id, and `useChatSend` gives each message one.
 */

import { sameElements } from '../../../../utilities/same-elements'
import type { ChatMessageData } from '../types'
import type { ChatBranch, ChatFork, ChatTree } from './types'

/** The forks of a transcript with no branch. @internal */
const NO_FORKS: Readonly<Record<string, ChatFork>> = {}

/**
 * The tree of a list: the list shows, and no branch hides.
 *
 * @internal
 */
export function toChatTree(path: ChatMessageData[]): ChatTree {
	return { path, forks: NO_FORKS }
}

/**
 * The tree with `path` in place of its shown path, and the same forks. A rule
 * that returns the path it read returns the tree by reference.
 *
 * @internal
 */
export function withPath(tree: ChatTree, path: ChatMessageData[]): ChatTree {
	return path === tree.path ? tree : { ...tree, path }
}

/** The key of the fork at `index` of the path: the id before it, or `''` at the start. @internal */
function forkKey(path: readonly ChatMessageData[], index: number): string {
	return path[index - 1]?.id ?? ''
}

/**
 * The index on the path of the place of the fork that `key` names, or `-1`
 * when the message of the key is not on the path. Such a fork is below a
 * branch that hides. @internal
 */
function forkPlace(path: readonly ChatMessageData[], key: string): number {
	if (key === '') return 0

	const index = path.findIndex((message) => message.id === key)

	return index === -1 ? -1 : index + 1
}

/** The id of the first message of a branch. @internal */
function headId(branch: readonly ChatMessageData[]): string {
	return branch[0]?.id ?? ''
}

/** The forks without the fork that `key` names. @internal */
function withoutFork(forks: Readonly<Record<string, ChatFork>>, key: string) {
	return Object.fromEntries(Object.entries(forks).filter(([name]) => name !== key))
}

/**
 * The branches on the shown path, by the id of the message that shows. A place
 * with one branch has no entry.
 *
 * @internal
 */
export function chatBranches(tree: ChatTree): Record<string, ChatBranch> {
	const { path, forks } = tree

	const branches: Record<string, ChatBranch> = {}

	// The walk goes over the forks, and not over the path. A transcript holds
	// few forks, and a chunk reads the branches again on each change.
	for (const [key, fork] of Object.entries(forks)) {
		const message = path[forkPlace(path, key)]

		if (!message?.id) continue

		branches[message.id] = {
			index: fork.before.length,
			ids: [...fork.before.map(headId), message.id, ...fork.after.map(headId)],
		}
	}

	return branches
}

/**
 * Whether two sets of branches hold the same ids and show the same ones. A
 * streamed chunk gives a new set with the same content, and the shell keeps
 * the old set for it.
 *
 * @internal
 */
export function sameBranches(
	prev: Readonly<Record<string, ChatBranch>>,
	next: Readonly<Record<string, ChatBranch>>,
): boolean {
	const ids = Object.keys(next)

	return (
		ids.length === Object.keys(prev).length &&
		ids.every(
			(id) => prev[id]?.index === next[id]?.index && sameElements(prev[id]?.ids, next[id]?.ids),
		)
	)
}

/**
 * The tree with each message from `index` of the path hidden as the newest
 * branch at that place. Each branch that hid there before stays.
 *
 * With `message`, the message starts the next branch and shows. Without it, the
 * place shows no branch, and the next message there takes the newest branch.
 * A place with no message after it hides nothing.
 *
 * @internal
 */
export function addBranch(tree: ChatTree, index: number, message?: ChatMessageData): ChatTree {
	const { path, forks } = tree

	const hidden = path.slice(index)

	if (hidden.length === 0) return message ? withPath(tree, [...path, message]) : tree

	const key = forkKey(path, index)

	const fork = forks[key]

	return {
		path: message ? [...path.slice(0, index), message] : path.slice(0, index),
		forks: {
			...forks,
			[key]: { before: [...(fork?.before ?? []), hidden, ...(fork?.after ?? [])], after: [] },
		},
	}
}

/**
 * The tree that shows the branch whose first message `id` names. The fork of
 * that branch must be on the shown path. The branch shows each turn below it
 * as the reader left it, and the branch that showed hides in its place. An id
 * that names no hidden branch of a fork on the path changes nothing.
 *
 * @internal
 */
export function showBranch(tree: ChatTree, id: string): ChatTree {
	const { path, forks } = tree

	for (const [key, fork] of Object.entries(forks)) {
		const place = forkPlace(path, key)

		if (place === -1) continue

		const shown = path.slice(place)

		const branches = [...fork.before, ...(shown.length > 0 ? [shown] : []), ...fork.after]

		const target = branches.findIndex((branch) => headId(branch) === id)

		const branch = branches[target]

		if (!branch || branch === shown) continue

		return {
			path: [...path.slice(0, place), ...branch],
			forks: {
				...forks,
				[key]: { before: branches.slice(0, target), after: branches.slice(target + 1) },
			},
		}
	}

	return tree
}

/**
 * The tree with the newest branch shown at the end of the path, when a fork
 * there shows no branch. That ends the wait of a retry whose reply did not
 * land, and the reply that the retry hid shows again.
 *
 * @internal
 */
export function showNewestBranch(tree: ChatTree): ChatTree {
	const { path, forks } = tree

	const key = forkKey(path, path.length)

	const fork = forks[key]

	const branches = fork ? [...fork.before, ...fork.after] : []

	const newest = branches.at(-1)

	if (!newest) return tree

	const left = branches.slice(0, -1)

	return {
		path: [...path, ...newest],
		forks:
			left.length > 0 ? { ...forks, [key]: { before: left, after: [] } } : withoutFork(forks, key),
	}
}

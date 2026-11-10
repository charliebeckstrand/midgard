/**
 * The shapes of a transcript with branches. A retry or an edit adds a branch
 * and keeps the old one, so the transcript is a tree of messages. The reader
 * sees one path through it.
 */

import type { ChatMessageData } from '../types'

/**
 * The branches at one place of the transcript that do not show, on each side
 * of the branch that shows. Each branch is the list of its messages, from the
 * place where it starts, as the reader last saw it.
 *
 * @internal
 */
export type ChatFork = {
	/** The branches older than the one that shows, oldest first. */
	readonly before: readonly ChatMessageData[][]
	/** The branches newer than the one that shows, oldest first. */
	readonly after: readonly ChatMessageData[][]
}

/**
 * A transcript as a tree: the path that shows, and the branches that do not.
 *
 * @remarks
 * The path is the list that the transcript draws, so a rule over a message
 * list acts on the path and leaves the forks alone. A streamed chunk thus
 * costs what it costs on a transcript with no branches.
 *
 * A fork is keyed by the id of the message before its place, and `''` keys the
 * start. A branch that does not show keeps the forks below it in the same
 * record, so a reader who goes back to a branch finds each turn as they left
 * it.
 *
 * A place with a fork and no message after it shows no branch. A retry waits
 * there for its reply, and the reply then takes the newest branch.
 *
 * @internal
 */
export type ChatTree = {
	/** The messages that show, oldest first. */
	readonly path: ChatMessageData[]
	/** The branches that do not show, by the id of the message before their place. */
	readonly forks: Readonly<Record<string, ChatFork>>
}

/**
 * The branches at the place of one message on the shown path.
 *
 * @remarks
 * A retry adds a reply beside the old one, and an edit adds a user message
 * beside the old one. Each sibling is a branch. The message that shows is
 * `ids[index]`.
 */
export type ChatBranch = {
	/** The index in `ids` of the message that shows. */
	index: number
	/** The id of the first message of each branch at this place, oldest first. */
	ids: readonly string[]
}

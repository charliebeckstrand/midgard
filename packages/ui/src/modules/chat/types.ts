import type { ReactNode } from 'react'
import type { Mount } from '../../primitives/mount'
import type { ChatEmbedPart } from './engine/chat-content/types'

/**
 * Draws one {@link ChatEmbedPart}. The part reaches the renderer whole, so a
 * renderer reads `data` as its own shape and `id` as the block's address.
 *
 * `data` arrives as `unknown`, because the chat cannot know what a caller
 * embedded. The cast belongs here, at the registration, where the name and the
 * payload are agreed.
 *
 * @example
 *   const renderers = { revenue: (part) => <BarChart {...(part.data as RevenueData)} /> }
 */
export type ChatEmbedRenderer = (part: ChatEmbedPart) => ReactNode

/**
 * The renderers a transcript can draw, by embed name, and the fallback for a
 * name none of them claims.
 */
export type ChatEmbedRegistry = {
	/** Renderers by embed name. A name absent here falls to {@link ChatEmbedRegistry.fallback}. */
	renderers: Readonly<Record<string, ChatEmbedRenderer>>
	/** Draws a part whose `name` no renderer claims. Absent draws the module's own stated fallback. */
	fallback?: ChatEmbedRenderer
	/**
	 * When a renderer is mounted, relative to the reader reaching it.
	 *
	 * @remarks
	 * `lazy` (the default) holds a renderer back until its block is near the
	 * viewport, then keeps it. A transcript's embeds are mostly scrolled away
	 * above the newest reply, and a view is the most expensive thing a reply can
	 * carry. A bar chart on every reply of a 500-message transcript costs about
	 * seven times as much to mount as the same transcript carrying none.
	 *
	 * The module's own stated fallback is one line of text, so each policy
	 * draws it at once. A `fallback` of the registry is a renderer, and the
	 * policy holds it back as it holds any other.
	 *
	 * `always` mounts every renderer up front and live, for a caller who would
	 * rather pay that than reserve space for one. It takes no viewport observer.
	 * `active` unmounts a renderer that scrolls away. That costs a remount and
	 * the state of the view, and it saves the memory of a long transcript.
	 *
	 * Where nothing can observe the viewport, every policy mounts eagerly. The
	 * gate is an optimization, and the safe answer when the environment cannot
	 * tell is to draw. The server is the exception. Under `lazy` and `active`,
	 * the server markup holds a placeholder in the reserved space, because the
	 * client must hydrate the same markup. The view draws after hydration.
	 *
	 * A {@link ChatTranscript} windows its rows, and a row outside the window is
	 * not rendered. Under the window, `lazy` means "no second deferral", not
	 * "held". An embed the reader reached draws at once when its row returns,
	 * but the state the view held is gone. `always` cannot be honored under a
	 * window: a renderer mounts only while its row is rendered.
	 *
	 * @defaultValue 'lazy'
	 */
	mount?: Mount
}

/**
 * The views that a citation can select in, by `target`. `label` names the
 * view for a reader, such as `Late stops by day`. A screen reader reads it as
 * the description of the anchor. The `target` itself is an address and is
 * never read.
 */
export type ChatCitationTargets = Readonly<Record<string, { label: string }>>

/**
 * One choice of a {@link ChatPromptSource}: a dataset, a command, or anything
 * else that a question can name.
 */
export type ChatPromptItem = {
	/** Names the item in its source. It is the React key of its option. */
	key: string
	/** The words of the choice. The citation quotes the trigger and this label. */
	label: string
	/**
	 * What the citation carries. The view that the citation selects in reads it,
	 * and so does the transport. It must survive `JSON.stringify` if the app
	 * stores the conversation.
	 */
	selector: unknown
	/** A second line of the option, such as the arguments of a command. */
	description?: string
}

/**
 * A source of choices that a trigger character opens in `ChatPrompt`, such as
 * `@` for the datasets of a dashboard or `/` for its commands. A choice puts a
 * citation in the draft, with `target` from the source and `selector` from the
 * item.
 *
 * @remarks
 * The chat imports nothing from a domain. A source closes over the data of the
 * app, and the chat reads only the strings and the opaque `selector` that
 * `search` gives.
 *
 * A command is a source with `at: 'start'`. The chat runs no command: the
 * submit of the app reads a citation at offset 0 and decides what it runs.
 */
export type ChatPromptSource = {
	/** The character that opens the picker, such as `@` or `/`. */
	trigger: string
	/** Becomes the `target` of each citation that the source makes. */
	target: string
	/** Names the list of choices for a screen reader, such as `Datasets`. */
	label: string
	/**
	 * Where the trigger counts. `anywhere` is the start of the draft or after
	 * whitespace. `start` is the start of the draft only, as for a command.
	 * @defaultValue 'anywhere'
	 */
	at?: 'anywhere' | 'start'
	/**
	 * The items for a query: the text between the trigger and the caret. Give a
	 * list, or a promise of one.
	 *
	 * @remarks
	 * The picker calls `search` for each change of the query. The next query
	 * aborts `signal`, and the picker drops the result of an aborted search, so
	 * a slow answer cannot replace a later one. Pass `signal` to a `fetch`. A
	 * rejected promise shows a stated error in the picker.
	 */
	search: (
		query: string,
		signal: AbortSignal,
	) => readonly ChatPromptItem[] | Promise<readonly ChatPromptItem[]>
}

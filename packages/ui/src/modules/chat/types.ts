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
	 * `lazy` — the default — holds a renderer back until its block is near the
	 * viewport, then keeps it. A transcript's embeds are mostly scrolled away
	 * above the newest reply, and a view is the most expensive thing a reply can
	 * carry. A bar chart on every reply of a 500-message transcript costs about
	 * seven times as much to mount as the same transcript carrying none.
	 *
	 * `always` mounts every renderer up front and live, for a caller who would
	 * rather pay that than reserve space for one. It takes no viewport observer. `active` unmounts a renderer that scrolls
	 * away, trading a remount — and whatever state the view held — for the
	 * memory of a long transcript.
	 *
	 * Where nothing can observe the viewport, every policy mounts eagerly. The
	 * gate is an optimization, and the safe answer when the environment cannot
	 * tell is to draw. The server is the exception. Under `lazy` and `active`,
	 * the server markup holds the reserved space, because the client must
	 * hydrate the same markup. The view draws after hydration.
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

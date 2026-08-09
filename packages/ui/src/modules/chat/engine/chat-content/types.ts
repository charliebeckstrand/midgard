/**
 * What a chat message holds. A message is a `string` today, so it holds prose
 * and nothing else. A part list holds prose beside an embedded chart, a tool
 * call, an attachment, or a citation — the kinds the increments after this one
 * add (see the module ROADMAP §Increments).
 */

/**
 * One block of prose, written as GitHub-flavored Markdown. A `content` string
 * normalizes to exactly one of these, and it is the only kind the transcript
 * draws today.
 */
export type ChatTextPart = {
	kind: 'text'
	/**
	 * Names this block in its own message. The name is unique in the message and
	 * not in the conversation, because a message carries its own id.
	 *
	 * A block holds an identity because its position is not one. A stream that
	 * replaces one block, or that puts a block between two others, moves every
	 * block after it, and a rule that reads a position then reads a different
	 * block after each change. The id is what a merge names, what a React key
	 * reads, and what a citation points to after a reload.
	 */
	id: string
	text: string
}

/**
 * One embedded view: a chart of the numbers a reply quotes, a grid of the rows
 * it counted, a map of the stops it named.
 *
 * The chat draws none of them. `name` names a renderer a caller registered with
 * `ChatEmbedProvider`, and `data` is that renderer's own payload, so the module
 * imports no chart, no grid, and no map, and a chat with no embed pays for none
 * of them. A name nothing is registered under draws a stated fallback, because
 * a block a reader cannot see must still say it is there.
 */
export type ChatEmbedPart = {
	kind: 'embed'
	/**
	 * Names this block in its own message, as {@link ChatTextPart.id} does. A
	 * stream merges by it, and never by position.
	 */
	id: string
	/**
	 * Names the renderer that draws this block. This is the open axis of the
	 * union: a caller registers any name it likes, where `kind` stays closed and
	 * this module owns it.
	 */
	name: string
	/**
	 * What the renderer draws. `unknown` because the module cannot know: the
	 * payload belongs to the renderer, and the two agree on its shape at the
	 * registration, which is where the cast belongs.
	 */
	data: unknown
	/**
	 * How tall the view will be, in pixels, for the space to hold open while its
	 * renderer is held back under the `lazy` mount policy.
	 *
	 * Only the caller knows this — the module has not drawn the view yet, and
	 * asking the renderer would mean mounting the thing being deferred. Absent
	 * takes the module's default, which a view of another height makes the
	 * transcript settle by that difference the first time a reader reaches it.
	 */
	height?: number
}

/** How a tool call ended, as the reader is shown it. */
export type ChatToolStatus = 'running' | 'done' | 'failed'

/**
 * One step the assistant took: a query it ran, a lookup it made, a tool it
 * called.
 *
 * A reader needs this for two reasons, and the second is the sharper one. An
 * answer is easier to trust when the work behind it is visible — and a wrong
 * filter is invisible without it, so an answer drawn from the wrong rows reads
 * exactly like an answer drawn from the right ones.
 *
 * The block describes itself in text, where an `embed` names a renderer and
 * hands it an opaque payload. That is the whole difference between the two
 * kinds: a step is prose the module can draw, so it needs no registry.
 *
 * A tool that returns a view emits an `embed` beside this block rather than
 * nesting one inside it. Parts are a flat list on purpose, and a kind that held
 * other kinds would put a second shape into every rule that walks them.
 */
export type ChatToolPart = {
	kind: 'tool'
	/** Names this block in its own message, as {@link ChatTextPart.id} does. */
	id: string
	/** What ran, in the reader's words rather than the wire's: `Filter shipments`. */
	name: string
	/**
	 * How the call ended.
	 *
	 * `running` is the transport's to set and never the transport's alone to
	 * clear: `useChatSend` settles a block still marked `running` when the stream
	 * ends, stops, or throws, because a step left running draws a spinner that
	 * never stops. A reply the reader stopped did not finish its call, which is
	 * what `failed` says.
	 */
	status: ChatToolStatus
	/**
	 * One line naming what the call did — the filter it applied, the rows it
	 * matched. `formatQuerySummary` from the query module renders a query tree to
	 * exactly this, so a step over a query needs no formatter of its own.
	 */
	summary?: string
	/**
	 * What the step opens to, as GitHub-flavored Markdown. A block with none is
	 * drawn as a line rather than a disclosure, because there is nothing to open.
	 */
	detail?: string
}

/**
 * One block of a chat message. `kind` names the block, and it reaches the
 * fields that block holds: each kind carries its own payload under its own
 * names and no other kind's. A later kind is then one more member of the union,
 * rather than a wider type on a field every kind shares.
 *
 * The discriminant is `kind`, which is what the other engine unions in this
 * package read — `MapRouteFailure`, `QuerySummaryToken`, `CellTooltip`. It also
 * holds the block axis apart from the speaker axis a message already carries.
 *
 * The kinds are closed and this module owns them. That is what keeps each rule
 * over them a compiler check and not a lookup table. A caller does not add a
 * kind. `embed` shows how a caller extends the union without adding one: its
 * `name` field is the open axis, and a renderer registers under a name, which
 * is a field and not the discriminant.
 */
export type ChatPart = ChatTextPart | ChatEmbedPart | ChatToolPart

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
 * kind. Increment 4 adds `embed`, and that kind's `name` field is the open
 * axis: a caller registers a renderer under a name, which is a field and not
 * the discriminant.
 */
export type ChatPart = ChatTextPart

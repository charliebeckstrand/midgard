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
 *
 * @internal
 */
export type ChatTextPart = { kind: 'text'; text: string }

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
 * @internal
 */
export type ChatPart = ChatTextPart

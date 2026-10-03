/**
 * Kokkaku skeleton: kanban. One title line per column header and two lines
 * per card. The column count and the card count come from the composing
 * skeleton.
 *
 * `title` has the line height of the `md` text of the column header. `line`
 * and `meta` have the line height of the `sm` text of a card. The column,
 * header, body, and card boxes come from the real kata, so the board has the
 * box of a real board. The widths are defaults, and the lines do not go wider
 * than their box.
 *
 * Layer: kiso · Concern: skeleton form · Unit: kanban
 */

export const kanban = {
	title: 'h-6 w-24 max-w-full',
	line: 'h-5 w-32 max-w-full',
	meta: 'h-5 w-20 max-w-full',
} as const

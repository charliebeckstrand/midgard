/**
 * Kokkaku skeleton: kanban. Two lines per card.
 *
 * `line` and `meta` have the line height of the `sm` text of a card. The card
 * box comes from the real kata, so the card has the box of a real card. The
 * widths are defaults, and the lines do not go wider than the card.
 *
 * Layer: kiso · Concern: skeleton form · Unit: kanban
 */

export const kanban = {
	line: 'h-5 w-32 max-w-full',
	meta: 'h-5 w-20 max-w-full',
} as const

/**
 * Kokkaku skeleton: kanban. Two lines per card.
 *
 * `line` and `meta` have the line height of the `sm` text of a card. The card
 * box comes from the real kata, so the card has the box of a real card. The
 * widths are defaults, and the lines do not go wider than the card.
 *
 * Layer: kiso · Concern: skeleton form · Unit: kanban
 */

import { ji } from '../ji'

const { size } = ji

export const kanban = {
	line: [size.sm, 'h-lh w-32 max-w-full'].join(' '),
	meta: [size.sm, 'h-lh w-20 max-w-full'].join(' '),
} as const

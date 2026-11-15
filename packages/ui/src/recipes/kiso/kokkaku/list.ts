/**
 * Kokkaku skeleton: list. One label line and one description line per row.
 * The row count comes from the composing skeleton.
 *
 * `label` has the line height of the `md` label of a row, and `description`
 * has the line height of the `sm` description. The row padding and the
 * chrome come from the real row recipe, so the silhouette takes the step of
 * its nearest density scope, as the list does. The widths are defaults, and
 * the lines do not go wider than the row.
 *
 * Layer: kiso · Concern: skeleton form · Unit: list
 */

import { ji } from '../ji'

const { size } = ji

export const list = {
	label: [size.md, 'h-lh w-40 max-w-full'].join(' '),
	description: [size.sm, 'h-lh w-64 max-w-full'].join(' '),
} as const

/**
 * Kokkaku skeleton: nav item. One icon square and one label line per row.
 * The row count comes from the composing skeleton. A sidebar item has the
 * same form, so the sidebar kata reads this form too.
 *
 * The icon takes `shaku.icon.row.base`, as the Icon of a real row does. The label
 * has the line height of the stepped text of the row. The padding, the gap,
 * and the radius come from the box of the real row, so the silhouette takes
 * the step of its nearest density scope, as the row does. The label width is
 * a default, and the line does not go wider than the row.
 *
 * Layer: kiso · Concern: skeleton form · Unit: nav
 */

import { dan } from '../dan'
import { shaku } from '../shaku'

export const nav = {
	icon: ['shrink-0', shaku.icon.row.base],
	label: `${dan.size.row} w-24 max-w-full`,
} as const

/**
 * Kokkaku skeleton: control. Shared by every `<ControlFrame>`
 * consumer (Input, Textarea, Select, Listbox, Combobox, DatePicker,
 * ColorPicker).
 *
 * `fill` fills the parent. In a `<Group>`, the `flex` of the skeleton comes
 * from the `--group-member-flex` of the group. A horizontal group gives `1`,
 * so the skeleton shares the row with its siblings. A vertical group gives
 * `none`: the member keeps the control height, and the group stretches it to
 * the group width. In a column of auto height, `flex-1` gives the empty
 * placeholder a basis of zero, and thus a height of zero. Outside a group, the
 * variable is not set, and `flex` keeps its initial value. A direct child of a
 * group also takes a size-aware minimum width. Override via `className` (e.g.
 * `w-44 flex-none`) to pin a fixed slot.
 *
 * Layer: kiso · Concern: skeleton form · Unit: control
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const control = {
	// Heights match the live control outer box (ring-inclusive): 26px at xs,
	// 32px at sm, 38px at md, 44px at lg, and 50px at xl, so the placeholder
	// fills the same space as the resolved control. Each step is a stepped class,
	// so the silhouette takes the step of its nearest density scope, as the
	// control does.
	base: [rounded.lg, dan.size.control.base],
	fill: ['w-full flex-(--group-member-flex)', dan.size.control.min],
} as const

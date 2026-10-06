/**
 * Kokkaku skeleton: control. Shared by every `<ControlFrame>`
 * consumer (Input, Textarea, Select, Listbox, Combobox, DatePicker,
 * ColorPicker).
 *
 * `full` is the standalone-skeleton default; fills its parent. `group`
 * is the in-group default: grows to share the row with sibling
 * placeholders, with a size-aware minimum width. Override via `className`
 * (e.g. `w-44 flex-none`) to pin a fixed slot.
 *
 * Only a horizontal group shares its length between the members. In a
 * vertical group, the member does not grow. It keeps the control height, and
 * the group stretches it to the group width. In a column of auto height,
 * `flex-1` gives the empty placeholder a basis of zero, and thus a height of
 * zero.
 *
 * Layer: kiso · Concern: skeleton form · Unit: control
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const control = {
	// Heights match the live control outer box (ring-inclusive): sm 30px · md
	// 38px · lg 46px, so the placeholder fills the same space as the resolved
	// control. Each step is a stepped class, so the silhouette takes the step of
	// its nearest density scope, as the control does.
	base: [rounded.lg, dan.size.control.base],
	full: 'w-full',
	group: `flex-1 data-[group-orientation=vertical]:flex-none ${dan.size.control.min}`,
} as const

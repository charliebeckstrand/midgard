/**
 * Kokkaku skeleton — control. Shared by every `<ControlFrame>`
 * consumer (Input, Textarea, Select, Listbox, Combobox, DatePicker).
 *
 * `full` is the standalone-skeleton default — outside a `<Group>`, the
 * placeholder fills its parent (matching `ControlFrame`'s `w-full`
 * ancestry). `group` is the in-group default: a placeholder has no
 * intrinsic content to size from, so it grows (sibling placeholders
 * share the row) with a size-aware floor. Override via `className`
 * (e.g. `w-44 flex-none`) to pin a fixed slot.
 *
 * Layer: kiso · Concern: skeleton form · Unit: control
 */

import { kasane } from '../kasane'

export const control = {
	base: kasane.rounded.lg,
	full: 'w-full',
	group: {
		sm: 'flex-1 min-w-16',
		md: 'flex-1 min-w-24',
		lg: 'flex-1 min-w-32',
	},
	size: {
		sm: 'h-7.5',
		md: 'h-9.5',
		lg: 'h-11.5',
	},
	defaults: { size: 'md' as const },
} as const

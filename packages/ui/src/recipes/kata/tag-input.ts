import { omote, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { focus } = sen

export const k = {
	// A tag's bordered, inline box can't carry an outset stroke; focus reads
	// through an inset ring (see `sen.focus` shapes). The leading pad of the
	// removable chip is `removable` of the Badge kata. The chip takes the step
	// of the prefix scope, one step below the host Input.
	badge: [focus.inset],
	// Vertical padding for the tag row.
	//
	// A chip nearly fills the host Input's text-line box, so centered against
	// the bare input it clears the frame by only the centering gap and reads
	// squished. Padding the row one step above the control's `py` insets the
	// chips and lets the frame grow to fit the row. The row is in the prefix
	// slot, a scope one step below the host, so each value is for a host one
	// step above: `xs` for an `sm` host, `sm` for `md`, and `md` for `lg`.
	//
	// The row caps the hit areas of the remove buttons (`TouchTarget`) at the
	// space between them. When the row wraps, the buttons of two rows are the
	// `xs` gap of the row and the `py-ring-1` pad of two chips apart, 10px in all
	// at `md`. Along the row, a one-letter tag still puts the gap, the leading
	// pad, and the inner gap of its `xs` chip between two buttons, 14px or more at
	// `md`. The gap steps with the scope, so each cap is 2px less or more for
	// each step below or above.
	//
	// By default the row stays on one line and scrolls on the inline axis
	// (`omote.rail`). A chip does not shrink with the other chips. A tag wider
	// than the row truncates to the row (`BadgeRemovable`).
	// With `wrap`, the row wraps.
	tags: {
		base: [dan.space.tags.y, dan.gap.touch.tags.x, dan.gap.touch.tags.y],
		scroll: [...omote.rail, '*:shrink-0'],
	},
	/**
	 * The box of the add button while the tags wrap. It has the height of one
	 * row of tags: the block padding of the row, and inside it the line and the
	 * `py-ring-1` pad of a chip. The button is centered in the box, so it aligns
	 * with the first row of tags (`frame` of the Input kata). The suffix slot has
	 * the step of the prefix slot, so the lengths match at each step.
	 *
	 * The row of tags can fill the width up to the button. So the box keeps the
	 * touch gap of the row (`--touch-target-gap-x`) as its start margin, and caps
	 * the hit area of the button at that gap. Then the hit areas of the button and
	 * of the last remove button on the row do not overlap.
	 */
	add: {
		row: ['flex', dan.space.tags.y, dan.gap.touch.tags.x, 'ms-(--touch-target-gap-x)'],
		chip: ['flex items-center min-h-lh py-ring-1', dan.text.chip],
	},
	// The text input keeps a width that a draft tag fits in: half of the frame,
	// or 160px when that is less. On one line, the tags shrink and scroll before
	// the input goes below this floor, so a typed draft does not scroll out of
	// view in a narrow box.
	input: 'min-w-[min(50%,--spacing(40))]',
} as const

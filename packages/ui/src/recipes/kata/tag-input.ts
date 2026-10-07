import { sen } from '../kiso'
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
	// space between them. The row wraps, and the buttons of two rows are the
	// `xs` gap of the row and the `py-ring-1` pad of two chips apart, 10px in all
	// at `md`. Along the row, a one-letter tag still puts the gap, the leading
	// pad, and the inner gap of its `xs` chip between two buttons, 14px or more at
	// `md`. The gap steps with the scope, so each cap is 2px less or more for
	// each step below or above.
	tags: [
		dan.space.tags.y,
		'density-[xs,sm]:[--touch-target-gap-x:--spacing(3)]',
		'density-md:[--touch-target-gap-x:--spacing(3.5)]',
		'density-[lg,xl]:[--touch-target-gap-x:--spacing(4)]',
		'density-[xs,sm]:[--touch-target-gap-y:--spacing(2)]',
		'density-md:[--touch-target-gap-y:--spacing(2.5)]',
		'density-[lg,xl]:[--touch-target-gap-y:--spacing(3)]',
	],
	// The text input keeps a usable width. When the tag row leaves less, the input
	// moves to the next row of the wrapping frame, and the add button goes with
	// it. Without the floor, the input took the last sliver of the tag row and the
	// add button wrapped alone.
	input: 'min-w-16',
} as const

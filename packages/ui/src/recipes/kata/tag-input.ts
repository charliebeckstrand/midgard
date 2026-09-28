import { sen } from '../kiso'

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
	tags: 'density-py-ring-[2,2.5,3,3,3]',
} as const

import { sen } from '../kiso'

const { focus } = sen

export const k = {
	// A tag's bordered, inline box can't carry an outset stroke; focus reads
	// through an inset ring (see `sen.focus` shapes).
	//
	// The remove button's own padding insets its glyph from the trailing edge,
	// so the label is padded to the chip's `px` + the button's `bare.p` on the
	// leading side to sit symmetric with it — gated on `data-has-suffix`, so a
	// disabled chip (no button) keeps the symmetric `px`. The chip is a pill, so
	// it carries the `rounded-full` px bump (`kata/badge.ts`). The chip takes the
	// step of the prefix scope, one step below the host Input, so the pad is a
	// stepped class. `tag-input-chip-pad-boundary.test.ts` pins the sum at each
	// step that a chip takes.
	badge: [focus.inset, 'data-[has-suffix]:density-ps-ring-[2.25,3,3.75,4.5,4.5]'],
	// Vertical padding for the tag row, keyed by density.
	//
	// A chip nearly fills the host Input's text-line box, so centered against
	// the bare input it clears the frame by only the centering gap and reads
	// squished. Padding the row one step above the control's `py` insets the
	// chips and lets the frame grow to fit the row.
	tags: {
		sm: 'py-ring-2',
		md: 'py-ring-2.5',
		lg: 'py-ring-3',
	},
} as const

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
	// it carries the `rounded-full` px bump (`kata/badge.ts`). Inline per-size
	// `--spacing` (allowlisted in the spacing boundary); the sum is pinned by
	// `tag-input-chip-pad-boundary.test.ts`.
	badge: [
		focus.inset,
		'data-[has-suffix]:data-[density=xs]:ps-ring-2.25',
		'data-[has-suffix]:data-[density=sm]:ps-ring-3',
		'data-[has-suffix]:data-[density=md]:ps-ring-3.75',
	],
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

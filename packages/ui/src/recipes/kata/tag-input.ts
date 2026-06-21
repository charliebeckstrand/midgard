import { kasane, sen } from '../kiso'

const { padding } = kasane
const { focus } = sen

export const k = {
	// A tag's bordered, inline box can't carry an outset stroke; focus reads
	// through an inset ring (see `sen.focus` shapes).
	//
	// The remove button's own padding insets its glyph from the trailing edge,
	// so the label is padded to `badge.px + bare.p` on the leading side to sit
	// symmetric with it — gated on `data-has-suffix`, so a disabled chip (no
	// button) keeps the symmetric bare `px`. Inline per-size `--spacing`
	// (allowlisted in the spacing boundary); the sum is pinned by
	// `tag-input-chip-pad-boundary.test.ts`.
	badge: [
		focus.inset,
		'data-[has-suffix]:data-[size=xs]:pl-[calc(--spacing(1.75)-1px)]',
		'data-[has-suffix]:data-[size=sm]:pl-[calc(--spacing(2.5)-1px)]',
		'data-[has-suffix]:data-[size=md]:pl-[calc(--spacing(3.25)-1px)]',
	],
	// Vertical padding for the tag row, keyed by density.
	//
	// A chip nearly fills the host Input's text-line box, so centred against
	// the bare input it clears the frame by only the centring gap and reads
	// squished. Padding the row one step above the control's `py` insets the
	// chips and lets the frame grow to fit the row.
	tags: {
		sm: padding.py('2'),
		md: padding.py('2.5'),
		lg: padding.py('3'),
	},
} as const

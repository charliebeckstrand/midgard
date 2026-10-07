import { kasane, ma, omote, sen } from '../kiso'

const { bg, popover } = omote
const { outline } = sen

export const k = {
	padding: ma.p,
	px: ma.px,
	py: ma.py,
	radius: kasane.rounded,
	bg: {
		none: 'bg-transparent',
		surface: bg.surface,
		tint: bg.tint,
		popover,
	},
	outline: {
		/** The weight that `outline={true}` selects. */
		base: outline.default,
		/** The weights that a name selects. */
		weight: {
			subtle: outline.subtle,
			strong: outline.strong,
		},
	},
} as const

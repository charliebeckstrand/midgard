import { kasane, ma, omote, sen } from '../kiso'
import { panel } from '../kiso/panel'

const { bg, popover, glass } = omote
const { outline } = sen
const { surface } = panel

export const k = {
	padding: ma.p,
	px: ma.px,
	py: ma.py,
	radius: kasane.rounded,
	bg: {
		none: 'bg-transparent',
		surface: bg.surface,
		tint: bg.tint,
		panel: surface.bg,
		popover,
		glass,
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

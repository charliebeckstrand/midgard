import { kasane, ma, omote, sen } from '../kiso'
import { panel } from '../kiso/panel'

const { bg, popover, glass } = omote
const { outline } = sen
const { surface } = panel

export const k = {
	padding: ma.p,
	px: ma.px,
	py: ma.py,
	margin: { ...ma.m, auto: 'm-auto' },
	mx: { ...ma.mx, auto: 'mx-auto' },
	my: { ...ma.my, auto: 'my-auto' },
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
		default: outline.default,
		subtle: outline.subtle,
		strong: outline.strong,
	},
} as const

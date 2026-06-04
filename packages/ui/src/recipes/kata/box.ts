import { panel } from '../katakana/panel'
import { omote, sen } from '../kiso'

const { bg, popover, glass } = omote
const { outline } = sen
const { surface } = panel

export const k = {
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

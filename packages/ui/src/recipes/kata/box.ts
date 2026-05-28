import { omote, sen } from '../kiso'
import { panel } from '../kiso/panel'

export const k = {
	bg: {
		none: 'bg-transparent',
		surface: omote.surface,
		tint: omote.tint,
		panel: panel.surface.bg,
		popover: omote.popover,
		glass: omote.glass,
	},
	outline: {
		default: sen.outline.default,
		subtle: sen.outline.subtle,
		strong: sen.outline.strong,
	},
} as const

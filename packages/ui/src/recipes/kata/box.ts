import { omote, sen } from '../kiso'

export const k = {
	bg: {
		none: 'bg-transparent',
		surface: omote.surface,
		tint: omote.tint,
		panel: omote.panel.bg,
		popover: omote.popover,
		glass: omote.glass,
	},
	outline: {
		default: sen.outline,
		subtle: sen.outlineSubtle,
		strong: sen.outlineStrong,
	},
} as const

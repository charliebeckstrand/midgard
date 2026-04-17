import { kage } from '../kage'
import { maru } from '../maru'

export const navbar = {
	base: [
		// ── Layout ──────────────────────────────────────
		'flex items-center gap-4',
		'overflow-x-auto',
		// ── Spacing ─────────────────────────────────────
		'px-4 py-2.5',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
		// ── Border ──────────────────────────────────────
		'border',
	],
	variant: {
		outline: [kage.borderColor],
		plain: [kage.borderTransparent],
	},
	defaults: { variant: 'outline' as const },
}

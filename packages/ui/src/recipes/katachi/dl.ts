import { kage } from '../kage'
import { sumi } from '../sumi'

export const dl = {
	base: 'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
	term: [
		// ── Layout ──────────────────────────────────────
		'col-start-1',
		// ── Spacing ─────────────────────────────────────
		'pt-3',
		// ── Typography ──────────────────────────────────
		'font-medium',
		// ── Tokens ──────────────────────────────────────
		sumi.textMuted,
		kage.borderSubtleColor,
		// ── Border ──────────────────────────────────────
		'border-t first:border-none',
		// ── Desktop ─────────────────────────────────────
		'sm:py-3',
	],
	details: [
		// ── Spacing ─────────────────────────────────────
		'pb-3 pt-1',
		// ── Tokens ──────────────────────────────────────
		sumi.text,
		kage.borderSubtleColor,
		// ── Desktop ─────────────────────────────────────
		'sm:border-t sm:py-3',
		'sm:nth-2:border-none',
	],
}

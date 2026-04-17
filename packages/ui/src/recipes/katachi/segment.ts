import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const segment = {
	base: [
		// ── Layout ──────────────────────────────────────
		'inline-flex items-center',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
		omote.tint,
	],
	segment: [
		// ── Layout ──────────────────────────────────────
		'relative z-10 flex items-center justify-center',
		// ── Typography ──────────────────────────────────
		'font-medium select-none whitespace-nowrap',
		// ── Tokens ──────────────────────────────────────
		maru.rounded,
		ki.indicator,
		ki.ring,
		yasumi.disabled,
		// ── Cursor ──────────────────────────────────────
		'cursor-default',
		// ── Focus ───────────────────────────────────────
		'outline-none',
	],
	segmentCurrent: sumi.text,
	indicator: [
		// ── Color (light) ───────────────────────────────
		'bg-white',
		// ── Color (dark) ────────────────────────────────
		'dark:bg-zinc-600',
		// ── Tokens ──────────────────────────────────────
		kage.shadow,
	],
	size: {
		sm: { base: 'p-0.5 gap-0.5', segment: 'px-2.5 py-1 text-xs/4' },
		md: { base: 'p-1 gap-0.5', segment: 'px-3 py-1.5 text-sm/5' },
		lg: { base: 'p-1 gap-1', segment: 'px-4 py-2 text-base/6' },
	},
	defaults: { size: 'md' as const },
}

import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const switchRecipe = {
	wrapper: [
		// ── Layout ──────────────────────────────────────
		'relative inline-flex shrink-0 items-center',
		// ── Tokens ──────────────────────────────────────
		ki.outline,
		// ── Cursor ──────────────────────────────────────
		'cursor-pointer',
		// ── Has-checked ─────────────────────────────────
		'has-checked:*:data-[slot=switch-thumb]:bg-(--switch)',
		'has-checked:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
		'has-checked:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
	],
	color: nuri.switch,
	base: [
		// ── Tokens ──────────────────────────────────────
		maru.roundedFull,
		nuri.switchTrack,
		// ── Has-checked ─────────────────────────────────
		'has-checked:bg-(--switch-bg) has-checked:ring-(--switch-bg-ring) has-checked:ring-inset',
		// ── Hover ───────────────────────────────────────
		'not-has-[:disabled]:not-has-[:checked]:hover:bg-zinc-300',
		'dark:not-has-[:disabled]:not-has-[:checked]:hover:bg-white/15',
		// ── Disabled ────────────────────────────────────
		'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
	],
	size: {
		sm: [
			// ── Sizing ──────────────────────────────────────
			'h-5 w-8',
			'*:data-[slot=switch-thumb]:size-3',
			// ── Has-checked ─────────────────────────────────
			'has-checked:*:data-[slot=switch-thumb]:left-4',
		],
		md: [
			// ── Sizing ──────────────────────────────────────
			'h-6 w-10',
			'*:data-[slot=switch-thumb]:size-4',
			// ── Has-checked ─────────────────────────────────
			'has-checked:*:data-[slot=switch-thumb]:left-5',
		],
		lg: [
			// ── Sizing ──────────────────────────────────────
			'h-7 w-12',
			'*:data-[slot=switch-thumb]:size-5',
			// ── Has-checked ─────────────────────────────────
			'has-checked:*:data-[slot=switch-thumb]:left-6',
		],
	},
	input: waku.hidden,
	disabled: sumi.textDisabled,
	thumb: [
		// ── Layout ──────────────────────────────────────
		'absolute top-1 left-1 inline-block',
		// ── Tokens ──────────────────────────────────────
		maru.roundedFull,
		nuri.switchThumb,
		kage.shadow,
		// ── Effects ─────────────────────────────────────
		'pointer-events-none',
		// ── Transition ──────────────────────────────────
		'transition-[left] duration-200 ease-in-out',
	],
	field: {
		base: '*:data-[slot=control]:row-span-2 *:data-[slot=control]:mt-0',
		size: {
			sm: 'grid-cols-[2rem_1fr]',
			md: 'grid-cols-[2.5rem_1fr]',
			lg: 'grid-cols-[3rem_1fr]',
		},
	},
	defaults: { size: 'md' as const },
}

import { maru } from '../maru'
import { sen } from '../sen'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative block',
	'w-full',
	sen.ringInset,
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
	'after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset after:pointer-events-none',
	'hover:ring-zinc-950/20',
	'focus-within:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600 has-[[data-warning]]:focus-within:after:ring-amber-500 has-[[data-valid]]:focus-within:after:ring-green-600',
	'data-open:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600 has-[[data-warning]]:data-open:after:ring-amber-500 has-[[data-valid]]:data-open:after:ring-green-600',
	'has-[[data-invalid]]:ring-red-600 has-[[data-invalid]]:hover:ring-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-warning]]:ring-amber-500 has-[[data-warning]]:hover:ring-amber-500',
	'has-[[data-warning]]:not-focus-within:after:ring-1 has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-valid]]:ring-green-600 has-[[data-valid]]:hover:ring-green-600',
	'has-[[data-valid]]:not-focus-within:after:ring-1 has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[>:disabled]:opacity-50 has-[>:disabled]:ring-zinc-950/20 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed has-[>:disabled]:**:cursor-not-allowed',
	maru.rounded.lg,
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = ['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5']

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = ['dark:bg-white/5', 'dark:before:hidden']

export const control = {
	/** Structural base — positioning, ring, focus rings, disabled states. */
	base: [motoi, 'dark:hover:ring-white/20', 'dark:has-[>:disabled]:ring-white/15'],
	/** Surface chrome — background. */
	surface: [hiru, yoru],
}

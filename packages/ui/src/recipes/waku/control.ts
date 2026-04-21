import { maru } from '../maru'
import { sen } from '../sen'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative block',
	'w-full',
	sen.border,
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
	'after:absolute after:-inset-px after:rounded-lg after:ring-transparent after:ring-inset after:pointer-events-none',
	'hover:border-zinc-950/20',
	'focus-within:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600 has-[[data-warning]]:focus-within:after:ring-amber-500 has-[[data-valid]]:focus-within:after:ring-green-600',
	'data-open:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600 has-[[data-warning]]:data-open:after:ring-amber-500 has-[[data-valid]]:data-open:after:ring-green-600',
	'has-[[data-invalid]]:border-red-600 has-[[data-invalid]]:hover:border-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-warning]]:border-amber-500 has-[[data-warning]]:hover:border-amber-500',
	'has-[[data-warning]]:not-focus-within:after:ring-1 has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-valid]]:border-green-600 has-[[data-valid]]:hover:border-green-600',
	'has-[[data-valid]]:not-focus-within:after:ring-1 has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[>:disabled]:opacity-50 has-[>:disabled]:border-zinc-950/20 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed has-[>:disabled]:**:cursor-not-allowed',
	maru.rounded.lg,
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = ['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5']

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = ['dark:bg-white/5', 'dark:before:hidden']

export const control = {
	/** Structural base — positioning, border, focus rings, disabled states. */
	base: [motoi, 'dark:hover:border-white/20', 'dark:has-[>:disabled]:border-white/15'],
	/** Surface chrome — background and inner shadow. */
	surface: ['before:shadow-sm', hiru, yoru],
}

import { maru } from '../maru'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative block w-full',
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
	'after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset after:pointer-events-none',
	'focus-within:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600 has-[[data-warning]]:focus-within:after:ring-amber-500 has-[[data-valid]]:focus-within:after:ring-green-600',
	'data-open:after:ring-2 not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600 has-[[data-warning]]:data-open:after:ring-amber-500 has-[[data-valid]]:data-open:after:ring-green-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-warning]]:not-focus-within:after:ring-1 has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-valid]]:not-focus-within:after:ring-1 has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[>:disabled]:opacity-50 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed',
	maru.rounded,
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = ['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5']

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = ['dark:bg-white/5', 'dark:before:hidden']

/** Structural base — positioning, focus rings, disabled states. */
export const control = motoi

/** Surface chrome — background and inner shadow. Applied per variant. */
export const controlSurface = ['before:shadow-sm', hiru, yoru]

import { maru } from '../maru'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative block w-full',
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-sm',
	'after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset after:pointer-events-none',
	'focus-within:after:ring-2 not-has-[[data-invalid]]:focus-within:after:ring-blue-600 has-[[data-invalid]]:focus-within:after:ring-red-600',
	'data-open:after:ring-2 not-has-[[data-invalid]]:data-open:after:ring-blue-600 has-[[data-invalid]]:data-open:after:ring-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1 has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[>:disabled]:opacity-50 has-[>:disabled]:before:shadow-none has-[>:disabled]:cursor-not-allowed',
	maru.rounded,
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = ['bg-white', 'has-[>:disabled]:before:bg-zinc-950/5']

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = ['dark:bg-white/5', 'dark:before:hidden']

export const control = [motoi, hiru, yoru]

import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative w-full',
	'bg-transparent border',
	'focus:outline-hidden',
	'read-only:bg-transparent',
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = [
	'placeholder:text-zinc-500',
	'hover:border-zinc-950/20',
	'data-invalid:border-red-600 data-invalid:hover:border-red-600',
	'data-warning:border-amber-500 data-warning:hover:border-amber-500',
	'data-valid:border-green-600 data-valid:hover:border-green-600',
	'disabled:border-zinc-950/20 disabled:cursor-not-allowed',
]

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = [
	'dark:placeholder:text-zinc-400',
	'dark:hover:border-white/20',
	'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
	'dark:hover:disabled:border-white/15',
]

export const inputBase = [sumi.text, kage.border, motoi, hiru, yoru]

export const input = [...inputBase, 'block', take.control.md, maru.rounded]

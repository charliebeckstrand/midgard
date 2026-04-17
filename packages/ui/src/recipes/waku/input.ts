import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = [
	'relative',
	'w-full min-w-0 flex-1',
	'border-0',
	'bg-transparent',
	'focus:outline-hidden',
	'read-only:bg-transparent',
]

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = ['placeholder:text-zinc-500', 'disabled:cursor-not-allowed']

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = ['dark:placeholder:text-zinc-400']

export const inputBase = [sumi.text, motoi, hiru, yoru]

export const input = [...inputBase, 'block', take.control.md, maru.rounded]

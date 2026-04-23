import { iro } from '../iro'
import { ji } from '../ji'
import { maru } from '../maru'

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

export const inputBase = [...iro.text.default, ...motoi, ...hiru, ...yoru]

// Default control density — used by `textarea` and `select` whose size isn't variable.
const control = ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', ji.size.md]

export const input = ['block', ...inputBase, ...control, maru.rounded.lg]

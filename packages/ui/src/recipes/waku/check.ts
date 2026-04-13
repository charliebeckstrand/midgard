// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	check: [
		'absolute -inset-3 opacity-0 cursor-pointer',
		'disabled:cursor-not-allowed',
		'forced-colors:opacity-100 forced-colors:appearance-auto forced-colors:checked:appearance-auto',
	],
	surface: ['border shadow-xs', 'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed'],
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = [
	'border-zinc-950/15 bg-white',
	'not-has-[:disabled]:hover:border-zinc-950/30',
	'not-has-[:disabled]:group-hover/field:border-zinc-950/30',
]

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = [
	'dark:border-white/15 dark:bg-white/5',
	'dark:not-has-[:disabled]:hover:border-white/30',
	'dark:not-has-[:disabled]:group-hover/field:border-white/30',
]

/** Visually hidden native input that sits over a custom control (also used for switch). */
export const hidden = motoi.check
export const check = motoi.check
export const checkSurface = [motoi.surface, hiru, yoru]

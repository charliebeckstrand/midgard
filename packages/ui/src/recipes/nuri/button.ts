import { defineColors, mode } from './define-colors'
import { extend, outline, outlineHover, soft, softHover, withHover } from './palette'

export const buttonSolid = defineColors({
	zinc: {
		light:
			'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:transparent] [--btn-hover:color-mix(in_oklab,white_15%,transparent)]',
		dark: 'dark:[--btn-bg:var(--color-zinc-600)]',
	},
	white: {
		light: [
			'text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10',
			'hover:[--btn-border:var(--color-zinc-950)]/15',
		],
		dark: 'dark:[--btn-bg:var(--color-zinc-600)]',
	},
	dark: [
		'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:transparent]',
		'[--btn-icon:var(--color-zinc-400)] hover:[--btn-icon:var(--color-zinc-300)]',
	],
	red: {
		light: 'text-white [--btn-bg:var(--color-red-600)] [--btn-border:transparent]',
		dark: 'dark:[--btn-hover:color-mix(in_oklab,white_20%,transparent)]',
	},
	amber:
		'text-amber-100 [--btn-bg:var(--color-amber-600)] [--btn-border:var(--color-amber-600)]/80',
	green: 'text-white [--btn-bg:var(--color-green-600)] [--btn-border:transparent]',
	blue: 'text-white [--btn-bg:var(--color-blue-600)] [--btn-border:transparent]',
})

export const buttonSoft = withHover(
	{ ...soft, ...extend.soft },
	{ ...softHover, ...extend.softHover },
	'not-disabled:hover:',
)

export const buttonOutline = withHover(outline, outlineHover, 'not-disabled:hover:')

export const buttonSolidBase = mode('[--btn-hover:color-mix(in_oklab,black_10%,transparent)]', [
	'dark:[--btn-hover:color-mix(in_oklab,white_10%,transparent)]',
	'dark:border-white/5',
])

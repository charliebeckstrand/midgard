import { defineColors, mode } from './define-colors'

export const button = defineColors({
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
	dark: {
		light: [
			'text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:transparent]',
			'[--btn-icon:var(--color-zinc-400)] hover:[--btn-icon:var(--color-zinc-300)]',
		],
	},
	red: {
		light: 'text-white [--btn-bg:var(--color-red-600)] [--btn-border:transparent]',
		dark: 'dark:[--btn-hover:color-mix(in_oklab,white_20%,transparent)]',
	},
	amber: {
		light:
			'text-amber-100 [--btn-bg:var(--color-amber-600)] [--btn-border:var(--color-amber-600)]/80',
	},
	green: {
		light: 'text-white [--btn-bg:var(--color-green-600)] [--btn-border:transparent]',
	},
	blue: {
		light: 'text-white [--btn-bg:var(--color-blue-600)] [--btn-border:transparent]',
	},
})

export const buttonSoft = defineColors({
	zinc: {
		light: 'bg-zinc-600/10 text-zinc-700 not-disabled:hover:bg-zinc-600/20',
		dark: 'dark:bg-white/10 dark:text-zinc-300 dark:not-disabled:hover:bg-white/15',
	},
	white: {
		light: 'bg-white text-zinc-950 not-disabled:hover:bg-zinc-50',
		dark: 'dark:bg-white/10 dark:text-white dark:not-disabled:hover:bg-white/15',
	},
	dark: {
		light: 'bg-zinc-950/10 text-zinc-700 not-disabled:hover:bg-zinc-950/15',
		dark: 'dark:bg-white/10 dark:text-zinc-300 dark:not-disabled:hover:bg-white/15',
	},
	red: {
		light: 'bg-red-600/15 text-red-700 not-disabled:hover:bg-red-600/25',
		dark: 'dark:bg-red-500/15 dark:text-red-400 dark:not-disabled:hover:bg-red-500/25',
	},
	amber: {
		light: 'bg-amber-500/15 text-amber-700 not-disabled:hover:bg-amber-500/20',
		dark: 'dark:bg-amber-500/15 dark:text-amber-400 dark:not-disabled:hover:bg-amber-500/25',
	},
	green: {
		light: 'bg-green-600/15 text-green-700 not-disabled:hover:bg-green-600/25',
		dark: 'dark:bg-green-500/15 dark:text-green-400 dark:not-disabled:hover:bg-green-500/25',
	},
	blue: {
		light: 'bg-blue-600/15 text-blue-700 not-disabled:hover:bg-blue-600/25',
		dark: 'dark:bg-blue-500/15 dark:text-blue-400 dark:not-disabled:hover:bg-blue-500/25',
	},
})

export const buttonSolid = mode('[--btn-hover:color-mix(in_oklab,black_10%,transparent)]', [
	'dark:[--btn-hover:color-mix(in_oklab,white_10%,transparent)]',
	'dark:border-white/5',
])

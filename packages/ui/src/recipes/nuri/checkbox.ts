import { defineColors } from './define-colors'

export const checkbox = defineColors({
	zinc: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
		dark: 'dark:[--checkbox-checked-bg:var(--color-zinc-600)]',
	},
	white: {
		light:
			'[--checkbox-check:var(--color-zinc-900)] [--checkbox-checked-bg:var(--color-white)] [--checkbox-checked-border:var(--color-zinc-950)]/15',
	},
	dark: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] [--checkbox-checked-border:var(--color-zinc-950)]/90',
	},
	red: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] [--checkbox-checked-border:var(--color-red-800)]/90',
	},
	amber: {
		light:
			'[--checkbox-check:var(--color-amber-100)] [--checkbox-checked-bg:var(--color-amber-700)] [--checkbox-checked-border:var(--color-amber-600)]/80',
	},
	green: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-green-600)] [--checkbox-checked-border:var(--color-green-800)]/90',
	},
	blue: {
		light:
			'[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-blue-600)] [--checkbox-checked-border:var(--color-blue-800)]/90',
	},
})

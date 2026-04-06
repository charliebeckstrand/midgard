import { defineColors } from './define-colors'

export const radio = defineColors({
	zinc: {
		light:
			'[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
		dark: 'dark:[--radio-checked-bg:var(--color-zinc-600)]',
	},
	white: {
		light:
			'[--radio-checked-bg:var(--color-white)] [--radio-checked-border:var(--color-zinc-950)]/15 [--radio-checked-indicator:var(--color-zinc-900)]',
	},
	dark: {
		light:
			'[--radio-checked-bg:var(--color-zinc-900)] [--radio-checked-border:var(--color-zinc-950)]/90 [--radio-checked-indicator:var(--color-white)]',
	},
	red: {
		light:
			'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-red-600)] [--radio-checked-border:var(--color-red-800)]/90',
	},
	amber: {
		light:
			'[--radio-checked-bg:var(--color-amber-700)] [--radio-checked-border:var(--color-amber-600)]/80 [--radio-checked-indicator:var(--color-amber-100)]',
	},
	green: {
		light:
			'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-green-600)] [--radio-checked-border:var(--color-green-800)]/90',
	},
	blue: {
		light:
			'[--radio-checked-indicator:var(--color-white)] [--radio-checked-bg:var(--color-blue-600)] [--radio-checked-border:var(--color-blue-800)]/90',
	},
})

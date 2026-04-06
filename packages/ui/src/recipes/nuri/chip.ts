import { defineColors } from './define-colors'

export const chipBorder = defineColors({
	zinc: {
		light: 'border-zinc-300 text-zinc-700',
		dark: 'dark:border-zinc-600 dark:text-zinc-300',
	},
	red: {
		light: 'border-red-300 text-red-700',
		dark: 'dark:border-red-700 dark:text-red-400',
	},
	amber: {
		light: 'border-amber-300 text-amber-700',
		dark: 'dark:border-amber-700 dark:text-amber-400',
	},
	green: {
		light: 'border-green-300 text-green-700',
		dark: 'dark:border-green-700 dark:text-green-400',
	},
	blue: {
		light: 'border-blue-300 text-blue-700',
		dark: 'dark:border-blue-700 dark:text-blue-400',
	},
})

export const chipOutlineBorder = defineColors({
	zinc: {
		light: 'border-zinc-700',
		dark: 'dark:border-zinc-600',
	},
	red: {
		light: 'border-red-600',
		dark: 'dark:border-red-500',
	},
	amber: {
		light: 'border-amber-500',
		dark: 'dark:border-amber-500',
	},
	green: {
		light: 'border-green-600',
		dark: 'dark:border-green-500',
	},
	blue: {
		light: 'border-blue-600',
		dark: 'dark:border-blue-500',
	},
})

export const chipText = defineColors({
	zinc: {
		light: 'text-zinc-700',
		dark: 'dark:text-zinc-300',
	},
	red: {
		light: 'text-red-700',
		dark: 'dark:text-red-400',
	},
	amber: {
		light: 'text-amber-700',
		dark: 'dark:text-amber-400',
	},
	green: {
		light: 'text-green-700',
		dark: 'dark:text-green-400',
	},
	blue: {
		light: 'text-blue-700',
		dark: 'dark:text-blue-400',
	},
})

export const chipSolidActive = defineColors({
	zinc: {
		light: 'bg-zinc-600',
		dark: 'dark:bg-zinc-500',
	},
	red: {
		light: 'bg-red-500',
		dark: 'dark:bg-red-400',
	},
	amber: {
		light: 'bg-amber-400',
		dark: 'dark:bg-amber-400',
	},
	green: {
		light: 'bg-green-500',
		dark: 'dark:bg-green-400',
	},
	blue: {
		light: 'bg-blue-500',
		dark: 'dark:bg-blue-400',
	},
})

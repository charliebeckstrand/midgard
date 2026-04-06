import { defineColors } from './define-colors'

export const badgeSoft = defineColors({
	red: {
		light: ['bg-red-600/15 text-red-700', 'group-hover:bg-red-600/25'],
		dark: ['dark:bg-red-500/15 dark:text-red-400', 'dark:group-hover:bg-red-500/25'],
	},
	amber: {
		light: ['bg-amber-500/15 text-amber-700', 'group-hover:bg-amber-500/20'],
		dark: ['dark:bg-amber-500/15 dark:text-amber-400', 'dark:group-hover:bg-amber-500/25'],
	},
	green: {
		light: ['bg-green-600/15 text-green-700', 'group-hover:bg-green-600/25'],
		dark: ['dark:bg-green-500/15 dark:text-green-400', 'dark:group-hover:bg-green-500/25'],
	},
	blue: {
		light: ['bg-blue-600/15 text-blue-700', 'group-hover:bg-blue-600/25'],
		dark: ['dark:bg-blue-500/15 dark:text-blue-400', 'dark:group-hover:bg-blue-500/25'],
	},
	zinc: {
		light: ['bg-zinc-600/10 text-zinc-700', 'group-hover:bg-zinc-600/20'],
		dark: ['dark:bg-white/10 dark:text-zinc-300', 'dark:group-hover:bg-white/15'],
	},
	white: {
		light: ['bg-white text-zinc-950', 'group-hover:bg-zinc-50'],
		dark: ['dark:bg-white/10 dark:text-white', 'dark:group-hover:bg-white/15'],
	},
	dark: {
		light: ['bg-zinc-950/10 text-zinc-700', 'group-hover:bg-zinc-950/15'],
		dark: ['dark:bg-white/10 dark:text-zinc-300', 'dark:group-hover:bg-white/15'],
	},
})

export const badgeSolid = defineColors({
	red: {
		light: ['bg-red-600 text-white', 'group-hover:bg-red-700'],
		dark: ['dark:bg-red-500', 'dark:group-hover:bg-red-600'],
	},
	amber: {
		light: ['bg-amber-500 text-amber-950', 'group-hover:bg-amber-600'],
	},
	green: {
		light: ['bg-green-600 text-white', 'group-hover:bg-green-700'],
		dark: ['dark:bg-green-500', 'dark:group-hover:bg-green-600'],
	},
	blue: {
		light: ['bg-blue-600 text-white', 'group-hover:bg-blue-700'],
		dark: ['dark:bg-blue-500', 'dark:group-hover:bg-blue-600'],
	},
	zinc: {
		light: ['bg-zinc-700 text-white', 'group-hover:bg-zinc-800'],
		dark: ['dark:bg-zinc-600', 'dark:group-hover:bg-zinc-500'],
	},
	white: {
		light: ['bg-white text-zinc-950', 'group-hover:bg-zinc-100'],
		dark: ['dark:bg-zinc-200 dark:text-zinc-950', 'dark:group-hover:bg-zinc-300'],
	},
	dark: {
		light: ['bg-zinc-950 text-white', 'group-hover:bg-zinc-800'],
		dark: ['dark:bg-white dark:text-zinc-950', 'dark:group-hover:bg-zinc-200'],
	},
})

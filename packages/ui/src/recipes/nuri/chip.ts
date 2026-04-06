import { defineColors } from './define-colors'
import { merge, text } from './palette'

export { text }

const outlineBorder = defineColors({
	zinc: { light: 'border-zinc-300', dark: 'dark:border-zinc-600' },
	red: { light: 'border-red-300', dark: 'dark:border-red-700' },
	amber: { light: 'border-amber-300', dark: 'dark:border-amber-700' },
	green: { light: 'border-green-300', dark: 'dark:border-green-700' },
	blue: { light: 'border-blue-300', dark: 'dark:border-blue-700' },
})

export const outline = merge(outlineBorder, text)

export const chipSolidActive = defineColors({
	zinc: { light: 'bg-zinc-600', dark: 'dark:bg-zinc-500' },
	red: { light: 'bg-red-500', dark: 'dark:bg-red-400' },
	amber: { light: 'bg-amber-400', dark: 'dark:bg-amber-400' },
	green: { light: 'bg-green-500', dark: 'dark:bg-green-400' },
	blue: { light: 'bg-blue-500', dark: 'dark:bg-blue-400' },
})

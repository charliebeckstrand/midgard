export const paddingMap = {
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-5',
} as const

export const borderMap = {
	solid: 'border border-zinc-300 dark:border-zinc-700',
	dashed: 'border border-dashed border-zinc-300 dark:border-zinc-700',
} as const

export type AreaPadding = keyof typeof paddingMap
export type AreaBorder = keyof typeof borderMap

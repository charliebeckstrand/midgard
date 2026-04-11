export const minHMap = {
	full: 'min-h-full',
	screen: 'min-h-screen',
	dvh: 'min-h-dvh',
} as const

export const maxWMap = {
	sm: 'max-w-sm',
	md: 'max-w-md',
	lg: 'max-w-lg',
	xl: 'max-w-xl',
	'2xl': 'max-w-2xl',
	prose: 'max-w-prose',
} as const

export type CenterMinH = keyof typeof minHMap
export type CenterMaxW = keyof typeof maxWMap

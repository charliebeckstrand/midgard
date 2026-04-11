export const sizeMap = {
	sm: 'max-w-4xl',
	md: 'max-w-5xl',
	lg: 'max-w-6xl',
	xl: 'max-w-7xl',
	full: 'max-w-full',
} as const

export const paddingMap = {
	none: '',
	sm: 'px-2',
	md: 'px-4',
	lg: 'px-6',
} as const

export type ContainerSize = keyof typeof sizeMap
export type ContainerPadding = keyof typeof paddingMap

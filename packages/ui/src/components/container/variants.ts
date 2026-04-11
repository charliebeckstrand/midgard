export const sizeMap = {
	sm: 'max-w-3xl',
	md: 'max-w-5xl',
	lg: 'max-w-6xl',
	xl: 'max-w-7xl',
	full: 'max-w-full',
} as const

export const paddingMap = {
	none: '',
	sm: 'px-3 sm:px-4',
	md: 'px-4 sm:px-6 lg:px-8',
	lg: 'px-6 sm:px-8 lg:px-12',
} as const

export type ContainerSize = keyof typeof sizeMap
export type ContainerPadding = keyof typeof paddingMap

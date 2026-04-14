export { gapMap, type LayoutGap as SizerGap } from '../_layout'

export const sizeMap = {
	xs: 'max-w-xs',
	sm: 'max-w-sm',
	md: 'max-w-md',
	lg: 'max-w-lg',
	xl: 'max-w-xl',
	full: 'w-full',
} as const

export type SizerSize = keyof typeof sizeMap | false

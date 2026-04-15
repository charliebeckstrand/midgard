import { kumi } from '../../recipes'

export const gapMap = kumi.gap

export type SizerGap = keyof typeof kumi.gap

export const sizeMap = {
	xs: 'sm:max-w-xs',
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
	full: 'w-full',
} as const

export type SizerSize = keyof typeof sizeMap

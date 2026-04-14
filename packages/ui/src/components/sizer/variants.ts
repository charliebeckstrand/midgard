import { kumi } from '../../recipes'

export const gapMap = kumi.gap

export type SizerGap = keyof typeof kumi.gap

export const sizeMap = {
	xs: 'xs:min-w-xs',
	sm: 'sm:min-w-sm',
	md: 'md:min-w-md',
	lg: 'lg:min-w-lg',
	xl: 'xl:min-w-xl',
	full: 'w-full',
} as const

export type SizerSize = keyof typeof sizeMap | false

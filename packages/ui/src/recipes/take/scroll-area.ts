type ScrollAreaSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'dvh' | 'dvw'
type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both'

/** Scroll area scale — keyed by orientation so the scroll axis is what gets constrained. */
export const scrollArea = {
	vertical: {
		sm: 'h-24',
		md: 'h-48',
		lg: 'h-72',
		xl: 'h-96',
		'2xl': 'h-128',
		dvh: 'h-[100dvh]',
		dvw: 'w-[100dvw]',
	},
	horizontal: {
		sm: 'w-48',
		md: 'w-96',
		lg: 'w-144',
		xl: 'w-192',
		'2xl': 'w-256',
		dvh: 'h-[100dvh]',
		dvw: 'w-[100dvw]',
	},
	both: {
		sm: 'h-24 w-48',
		md: 'h-48 w-96',
		lg: 'h-72 w-144',
		xl: 'h-96 w-192',
		'2xl': 'h-128 w-256',
		dvh: 'h-[100dvh]',
		dvw: 'w-[100dvw]',
	},
} satisfies Record<ScrollAreaOrientation, Record<ScrollAreaSize, string>>

/**
 * Shaku scroll-area: dimension scales for `<ScrollArea>`. Keyed by
 * orientation (vertical / horizontal / both) and size step. `dvh` /
 * `dvw` give the viewport-locked variants.
 *
 * Layer: kiso · Concern: scroll-area dimension
 */

import type { ScrollOrientation } from '../../../types'

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'dvh' | 'dvw'

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
} satisfies Record<ScrollOrientation, Record<Size, string>>

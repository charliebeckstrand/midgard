/**
 * Shaku scroll-area: dimension scales for `<ScrollArea>`. Keyed by
 * orientation (vertical / horizontal / both) and extent step. `dvh` /
 * `dvw` give the viewport-locked variants. A width step never exceeds the
 * parent: `max-w-full` caps it in a narrower parent.
 *
 * Layer: kiso · Concern: scroll-area dimension
 */

import type { ScrollOrientation } from '../../../types'

type Extent = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'dvh' | 'dvw'

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
		sm: 'w-48 max-w-full',
		md: 'w-96 max-w-full',
		lg: 'w-144 max-w-full',
		xl: 'w-192 max-w-full',
		'2xl': 'w-256 max-w-full',
		dvh: 'h-[100dvh]',
		dvw: 'w-[100dvw]',
	},
	both: {
		sm: 'h-24 w-48 max-w-full',
		md: 'h-48 w-96 max-w-full',
		lg: 'h-72 w-144 max-w-full',
		xl: 'h-96 w-192 max-w-full',
		'2xl': 'h-128 w-256 max-w-full',
		dvh: 'h-[100dvh]',
		dvw: 'w-[100dvw]',
	},
} satisfies Record<ScrollOrientation, Record<Extent, string>>

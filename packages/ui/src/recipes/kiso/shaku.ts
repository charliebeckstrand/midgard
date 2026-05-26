/**
 * Shaku (尺) — measure.
 *
 * Dimension scales — width, height, and the icon-slot size grid. Typography
 * lives in `ji`; padding, margin, and gap live in `ma`. Density presets
 * (button / compact / control) sit with their component in `kata`, composed
 * from these primitives.
 *
 * Layer: kiso · Concern: sizing
 */

import type { ScrollOrientation } from '../../types'

/** Icon slot — sizes `data-slot="icon"` children per density step. */
const icon = {
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0',
}

/** Avatar dimension scale. */
const avatar = {
	sm: 'size-7',
	md: 'size-9',
	lg: 'size-11',
}

/** Mark density — shared by inline code and kbd. Sized to sit naturally within body text. */
const mark = {
	base: ['font-mono', 'bg-current/15', 'rounded-md'],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: ['text-xs', 'p-1.25'],
		lg: ['text-sm', 'p-1.5'],
	},
} as const

/** Panel max-width scale for dialogs and sheets. */
const panel = {
	xs: 'sm:max-w-xs',
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
	'2xl': 'sm:max-w-2xl',
	'3xl': 'sm:max-w-3xl',
	'4xl': 'sm:max-w-4xl',
	'5xl': 'sm:max-w-5xl',
	'6xl': 'sm:max-w-6xl',
	'7xl': 'sm:max-w-7xl',
	full: 'sm:max-w-full',
} as const

type ScrollAreaSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'dvh' | 'dvw'

type ScrollAreaOrientation = ScrollOrientation

/** Scroll area dimensions keyed by orientation. */
const scrollArea = {
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

/** Combobox sizing — icon inset 1 px within the control border. */
const combobox = {
	icon: 'absolute inset-y-px right-px',
}

/** Listbox sizing — icon flush to the button border. */
const listbox = {
	icon: 'absolute inset-y-0 right-0',
}

export const shaku = {
	icon,
	avatar,
	panel,
	scrollArea,
	mark,
	combobox,
	listbox,
} as const

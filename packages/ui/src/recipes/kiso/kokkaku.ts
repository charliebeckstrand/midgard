/**
 * Kokkaku (骨格) — skeletal frames.
 *
 * Skeleton placeholder dimensions per component — stripped of chrome,
 * variant, and colour so placeholders track the real component's silhouette.
 *
 * Layer: kiso · Concern: skeleton form
 */

import { shaku } from './shaku'

const avatar = {
	base: 'rounded-full',
	size: shaku.avatar,
	defaults: { size: 'md' as const },
}

const badge = {
	base: 'rounded-md',
	size: {
		xs: ['h-4', 'w-10'],
		sm: ['h-5', 'w-12'],
		md: ['h-6', 'w-14'],
		lg: ['h-7', 'w-16'],
	},
	defaults: { size: 'md' as const },
}

const button = {
	base: 'rounded-lg',
	size: {
		xs: ['h-6', 'w-16'],
		sm: ['h-7', 'w-20'],
		md: ['h-9', 'w-24'],
		lg: ['h-11', 'w-28'],
	},
	defaults: { size: 'md' as const },
}

const card = {
	base: 'w-full',
	size: {
		sm: ['h-24', 'rounded-sm'],
		md: ['h-32', 'rounded-md'],
		lg: ['h-40', 'rounded-lg'],
	},
	defaults: { size: 'md' as const },
}

const checkbox = {
	base: ['size-4.5', 'rounded-sm'],
}

const formControl = {
	base: ['rounded-lg'],
	/**
	 * Standalone-skeleton default — outside a `<Group>`, fills its parent
	 * (matching `ControlFrame`'s `w-full` ancestry).
	 */
	full: ['w-full'],
	/**
	 * Group-skeleton default. Inside a `<Group>` the placeholder has no
	 * intrinsic content to size from, so it defaults to growing (sibling
	 * placeholders share the row) with a size-aware floor. Override via
	 * `className` (e.g. `w-44 flex-none`) to pin a fixed slot.
	 */
	group: {
		sm: 'flex-1 min-w-16',
		md: 'flex-1 min-w-24',
		lg: 'flex-1 min-w-32',
	},
	size: {
		sm: 'h-7.5',
		md: 'h-9.5',
		lg: 'h-11.5',
	},
	defaults: { size: 'md' as const },
}

const heading = {
	base: 'sm:max-w-sm',
	level: {
		1: 'h-8',
		2: 'h-7',
		3: 'h-6',
		4: 'h-5',
		5: 'h-4',
		6: 'h-3',
	},
	defaults: { level: 1 as const },
}

const radio = {
	base: ['size-4.5', 'rounded-full'],
}

const switchRecipe = {
	base: 'rounded-full',
	size: {
		sm: ['h-5', 'w-8'],
		md: ['h-6', 'w-10'],
		lg: ['h-7', 'w-12'],
	},
	defaults: { size: 'md' as const },
}

const text = {
	base: 'h-6 sm:max-w-sm',
}

const textarea = {
	base: ['w-full', 'rounded-lg'],
}

export const kokkaku = {
	avatar,
	badge,
	button,
	card,
	checkbox,
	formControl,
	heading,
	radio,
	switch: switchRecipe,
	text,
	textarea,
} as const

export type Kokkaku = typeof kokkaku

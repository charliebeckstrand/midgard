/**
 * Shared variant maps for layout components.
 *
 * Stack, Flex, Sizer, and Split all reference these maps so gap, alignment,
 * and justify tokens stay consistent across the layout hierarchy.
 */

// ─── Gap ────────────────────────────────────────────────────────────────────────

export const gapMap = {
	0: 'gap-0',
	1: 'gap-1',
	2: 'gap-2',
	3: 'gap-3',
	4: 'gap-4',
	5: 'gap-5',
	6: 'gap-6',
	8: 'gap-8',
	10: 'gap-10',
	12: 'gap-12',
	16: 'gap-16',
} as const

export type LayoutGap = keyof typeof gapMap

// ─── Flex direction ─────────────────────────────────────────────────────────────

export const directionMap = {
	row: 'flex-row',
	column: 'flex-col',
	'row-reverse': 'flex-row-reverse',
	'column-reverse': 'flex-col-reverse',
} as const

export type LayoutDirection = keyof typeof directionMap

// ─── Cross-axis alignment (items) ───────────────────────────────────────────────

export const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
	baseline: 'items-baseline',
} as const

export type LayoutAlign = keyof typeof alignMap

// ─── Main-axis alignment (justify) ──────────────────────────────────────────────

export const justifyMap = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end',
	between: 'justify-between',
	around: 'justify-around',
	evenly: 'justify-evenly',
} as const

export type LayoutJustify = keyof typeof justifyMap

// ─── Width ──────────────────────────────────────────────────────────────────────

export const widthMap = {
	full: 'w-full',
	min: 'w-min',
	max: 'w-max',
	fit: 'w-fit',
} as const

export type LayoutWidth = keyof typeof widthMap

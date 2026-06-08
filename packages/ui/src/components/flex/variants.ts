import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/flex'
import { type Breakpoint, type Responsive, resolveResponsive } from '../../types'

export type FlexGap = Ma | 0

const gapMap = k.gap

const directionMap = {
	row: 'flex-row',
	col: 'flex-col',
	'row-reverse': 'flex-row-reverse',
	'col-reverse': 'flex-col-reverse',
} as const

export const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
	baseline: 'items-baseline',
} as const

const justifyMap = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end',
	between: 'justify-between',
	around: 'justify-around',
	evenly: 'justify-evenly',
} as const

export type FlexDirection = keyof typeof directionMap
export type FlexAlign = keyof typeof alignMap
export type FlexJustify = keyof typeof justifyMap

export type ResponsiveDirection = Responsive<FlexDirection>
export type ResponsiveAlign = Responsive<FlexAlign>
export type ResponsiveGap = Responsive<FlexGap>
export type ResponsiveJustify = Responsive<FlexJustify>

// Mobile-first (min-width) maps spelled out as literals so Tailwind's scanner
// can source each class — it can't see classes built by string interpolation.
// Direction and align are the only props used with responsive objects, so only
// they need the full maps; gap/justify interpolate (never used responsively).
const responsiveDirectionMap: Record<Breakpoint, Record<FlexDirection, string>> = {
	initial: directionMap,
	sm: {
		row: 'sm:flex-row',
		col: 'sm:flex-col',
		'row-reverse': 'sm:flex-row-reverse',
		'col-reverse': 'sm:flex-col-reverse',
	},
	md: {
		row: 'md:flex-row',
		col: 'md:flex-col',
		'row-reverse': 'md:flex-row-reverse',
		'col-reverse': 'md:flex-col-reverse',
	},
	lg: {
		row: 'lg:flex-row',
		col: 'lg:flex-col',
		'row-reverse': 'lg:flex-row-reverse',
		'col-reverse': 'lg:flex-col-reverse',
	},
	xl: {
		row: 'xl:flex-row',
		col: 'xl:flex-col',
		'row-reverse': 'xl:flex-row-reverse',
		'col-reverse': 'xl:flex-col-reverse',
	},
	'2xl': {
		row: '2xl:flex-row',
		col: '2xl:flex-col',
		'row-reverse': '2xl:flex-row-reverse',
		'col-reverse': '2xl:flex-col-reverse',
	},
}

const responsiveAlignMap: Record<Breakpoint, Record<FlexAlign, string>> = {
	initial: alignMap,
	sm: {
		start: 'sm:items-start',
		center: 'sm:items-center',
		end: 'sm:items-end',
		stretch: 'sm:items-stretch',
		baseline: 'sm:items-baseline',
	},
	md: {
		start: 'md:items-start',
		center: 'md:items-center',
		end: 'md:items-end',
		stretch: 'md:items-stretch',
		baseline: 'md:items-baseline',
	},
	lg: {
		start: 'lg:items-start',
		center: 'lg:items-center',
		end: 'lg:items-end',
		stretch: 'lg:items-stretch',
		baseline: 'lg:items-baseline',
	},
	xl: {
		start: 'xl:items-start',
		center: 'xl:items-center',
		end: 'xl:items-end',
		stretch: 'xl:items-stretch',
		baseline: 'xl:items-baseline',
	},
	'2xl': {
		start: '2xl:items-start',
		center: '2xl:items-center',
		end: '2xl:items-end',
		stretch: '2xl:items-stretch',
		baseline: '2xl:items-baseline',
	},
}

export function resolveDirection(value: ResponsiveDirection | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveDirectionMap[bp ?? 'initial'][v])
}

export function resolveAlign(value: ResponsiveAlign | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveAlignMap[bp ?? 'initial'][v])
}

export function resolveGap(value: ResponsiveGap | undefined): string[] {
	return resolveResponsive(value, (v, bp) => {
		const cls = gapMap[v]

		return bp ? `${bp}:${cls}` : cls
	})
}

export function resolveJustify(value: ResponsiveJustify | undefined): string[] {
	return resolveResponsive(value, (v, bp) => {
		const cls = justifyMap[v]

		return bp ? `${bp}:${cls}` : cls
	})
}

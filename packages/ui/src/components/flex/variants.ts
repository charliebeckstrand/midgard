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
// can source each class — it cannot see classes built by string interpolation.
// The `initial` row reuses the base map; every breakpoint row is a literal so
// `sm:gap-2`, `lg:justify-between`, etc. exist verbatim in source.
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

const responsiveGapMap: Record<Breakpoint, Record<FlexGap, string>> = {
	initial: gapMap,
	sm: {
		0: 'sm:gap-0',
		xs: 'sm:gap-1',
		sm: 'sm:gap-2',
		md: 'sm:gap-3',
		lg: 'sm:gap-4',
		xl: 'sm:gap-6',
	},
	md: {
		0: 'md:gap-0',
		xs: 'md:gap-1',
		sm: 'md:gap-2',
		md: 'md:gap-3',
		lg: 'md:gap-4',
		xl: 'md:gap-6',
	},
	lg: {
		0: 'lg:gap-0',
		xs: 'lg:gap-1',
		sm: 'lg:gap-2',
		md: 'lg:gap-3',
		lg: 'lg:gap-4',
		xl: 'lg:gap-6',
	},
	xl: {
		0: 'xl:gap-0',
		xs: 'xl:gap-1',
		sm: 'xl:gap-2',
		md: 'xl:gap-3',
		lg: 'xl:gap-4',
		xl: 'xl:gap-6',
	},
	'2xl': {
		0: '2xl:gap-0',
		xs: '2xl:gap-1',
		sm: '2xl:gap-2',
		md: '2xl:gap-3',
		lg: '2xl:gap-4',
		xl: '2xl:gap-6',
	},
}

const responsiveJustifyMap: Record<Breakpoint, Record<FlexJustify, string>> = {
	initial: justifyMap,
	sm: {
		start: 'sm:justify-start',
		center: 'sm:justify-center',
		end: 'sm:justify-end',
		between: 'sm:justify-between',
		around: 'sm:justify-around',
		evenly: 'sm:justify-evenly',
	},
	md: {
		start: 'md:justify-start',
		center: 'md:justify-center',
		end: 'md:justify-end',
		between: 'md:justify-between',
		around: 'md:justify-around',
		evenly: 'md:justify-evenly',
	},
	lg: {
		start: 'lg:justify-start',
		center: 'lg:justify-center',
		end: 'lg:justify-end',
		between: 'lg:justify-between',
		around: 'lg:justify-around',
		evenly: 'lg:justify-evenly',
	},
	xl: {
		start: 'xl:justify-start',
		center: 'xl:justify-center',
		end: 'xl:justify-end',
		between: 'xl:justify-between',
		around: 'xl:justify-around',
		evenly: 'xl:justify-evenly',
	},
	'2xl': {
		start: '2xl:justify-start',
		center: '2xl:justify-center',
		end: '2xl:justify-end',
		between: '2xl:justify-between',
		around: '2xl:justify-around',
		evenly: '2xl:justify-evenly',
	},
}

export function resolveDirection(value: ResponsiveDirection | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveDirectionMap[bp ?? 'initial'][v])
}

export function resolveAlign(value: ResponsiveAlign | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveAlignMap[bp ?? 'initial'][v])
}

export function resolveGap(value: ResponsiveGap | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveGapMap[bp ?? 'initial'][v])
}

export function resolveJustify(value: ResponsiveJustify | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveJustifyMap[bp ?? 'initial'][v])
}

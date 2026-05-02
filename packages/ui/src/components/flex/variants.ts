import type { Ma } from '../../recipes/ryu/ma'
import type { Breakpoint, Responsive } from '../../types'
import { resolveResponsive } from '../grid'

export type FlexGap = Ma

export const gapMap = {
	xs: 'gap-xs',
	sm: 'gap-sm',
	md: 'gap-md',
	lg: 'gap-lg',
	xl: 'gap-xl',
} as const satisfies Record<FlexGap, string>

export const directionMap = {
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

export const justifyMap = {
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

const responsiveDirectionMap: Record<Breakpoint, Record<FlexDirection, string>> = {
	initial: directionMap,
	sm: {
		row: 'max-sm:flex-row',
		col: 'max-sm:flex-col',
		'row-reverse': 'max-sm:flex-row-reverse',
		'col-reverse': 'max-sm:flex-col-reverse',
	},
	md: {
		row: 'max-md:flex-row',
		col: 'max-md:flex-col',
		'row-reverse': 'max-md:flex-row-reverse',
		'col-reverse': 'max-md:flex-col-reverse',
	},
	lg: {
		row: 'max-lg:flex-row',
		col: 'max-lg:flex-col',
		'row-reverse': 'max-lg:flex-row-reverse',
		'col-reverse': 'max-lg:flex-col-reverse',
	},
	xl: {
		row: 'max-xl:flex-row',
		col: 'max-xl:flex-col',
		'row-reverse': 'max-xl:flex-row-reverse',
		'col-reverse': 'max-xl:flex-col-reverse',
	},
	'2xl': {
		row: 'max-2xl:flex-row',
		col: 'max-2xl:flex-col',
		'row-reverse': 'max-2xl:flex-row-reverse',
		'col-reverse': 'max-2xl:flex-col-reverse',
	},
}

const responsiveAlignMap: Record<Breakpoint, Record<FlexAlign, string>> = {
	initial: alignMap,
	sm: {
		start: 'max-sm:items-start',
		center: 'max-sm:items-center',
		end: 'max-sm:items-end',
		stretch: 'max-sm:items-stretch',
		baseline: 'max-sm:items-baseline',
	},
	md: {
		start: 'max-md:items-start',
		center: 'max-md:items-center',
		end: 'max-md:items-end',
		stretch: 'max-md:items-stretch',
		baseline: 'max-md:items-baseline',
	},
	lg: {
		start: 'max-lg:items-start',
		center: 'max-lg:items-center',
		end: 'max-lg:items-end',
		stretch: 'max-lg:items-stretch',
		baseline: 'max-lg:items-baseline',
	},
	xl: {
		start: 'max-xl:items-start',
		center: 'max-xl:items-center',
		end: 'max-xl:items-end',
		stretch: 'max-xl:items-stretch',
		baseline: 'max-xl:items-baseline',
	},
	'2xl': {
		start: 'max-2xl:items-start',
		center: 'max-2xl:items-center',
		end: 'max-2xl:items-end',
		stretch: 'max-2xl:items-stretch',
		baseline: 'max-2xl:items-baseline',
	},
}

export function resolveDirection(value: ResponsiveDirection | undefined): string[] {
	return resolveResponsive(
		value,
		(v, bp) => responsiveDirectionMap[(bp ?? 'initial') as Breakpoint][v],
	)
}

export function resolveAlign(value: ResponsiveAlign | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveAlignMap[(bp ?? 'initial') as Breakpoint][v])
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

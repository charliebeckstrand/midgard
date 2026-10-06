import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/flex'
import { atBreakpoint, type Responsive, resolveResponsive } from '../../types'

/** Spacing scale for the gap between flex children; a `Ma` step, `0` included. */
export type FlexGap = Ma

const gapMap = k.gap

const directionMap = {
	row: 'flex-row',
	col: 'flex-col',
	'row-reverse': 'flex-row-reverse',
	'col-reverse': 'flex-col-reverse',
} as const

const alignMap = {
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

/** Main-axis orientation: `row`, `col`, or their reversed variants. */
export type FlexDirection = keyof typeof directionMap
/** Cross-axis alignment (`align-items`): start, center, end, stretch, baseline. */
export type FlexAlign = keyof typeof alignMap
/** Main-axis distribution (`justify-content`): start, center, end, between, around, evenly. */
export type FlexJustify = keyof typeof justifyMap

/** {@link FlexDirection} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveDirection = Responsive<FlexDirection>
/** {@link FlexAlign} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveAlign = Responsive<FlexAlign>
/** {@link FlexGap} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveGap = Responsive<FlexGap>
/** {@link FlexJustify} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveJustify = Responsive<FlexJustify>

export function resolveDirection(value: ResponsiveDirection | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(directionMap[v], bp))
}

export function resolveAlign(value: ResponsiveAlign | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(alignMap[v], bp))
}

export function resolveGap(value: ResponsiveGap | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(gapMap[v], bp))
}

export function resolveJustify(value: ResponsiveJustify | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(justifyMap[v], bp))
}

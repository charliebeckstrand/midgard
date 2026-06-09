import type { CSSProperties } from 'react'
import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/grid'
import { BREAKPOINTS, type Breakpoint, type Responsive, resolveResponsive } from '../../types'

export type { Responsive }

export type GridGap = Ma

// Numeric grid props (`columns`, `rows`, `span`, `rowSpan`, `start`,
// `rowStart`) are threaded through CSS custom properties read by static
// Tailwind utilities.
//
// Each breakpoint owns a distinct variable (`--cols`, `--cols-sm`, …); only
// the breakpoints with a user-provided value emit an override class. The
// result: a fixed set of literal class strings the JIT scanner can index,
// with arbitrary numeric values at runtime — no safelist needed.

type ClassMap = Record<Breakpoint, string>

type ResolvedResponsive = {
	classes: string[]
	style: CSSProperties
}

const EMPTY: ResolvedResponsive = { classes: [], style: {} }

function varName(prefix: string, bp: Breakpoint): string {
	return bp === 'initial' ? `--${prefix}` : `--${prefix}-${bp}`
}

function resolveScalar<T>(
	value: Responsive<T> | undefined,
	prefix: string,
	classMap: ClassMap,
	toCss: (v: T) => string | number,
): ResolvedResponsive {
	if (value === undefined) return EMPTY

	const classes: string[] = []

	const style: Record<string, string | number> = {}

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const obj: Partial<Record<Breakpoint, T>> = value

		for (const bp of BREAKPOINTS) {
			const v = obj[bp]

			if (v === undefined) continue

			classes.push(classMap[bp])

			style[varName(prefix, bp)] = toCss(v)
		}
	} else {
		classes.push(classMap.initial)

		style[varName(prefix, 'initial')] = toCss(value)
	}

	return { classes, style: style as CSSProperties }
}

const cols: ClassMap = {
	initial: 'grid-cols-[repeat(var(--cols),minmax(0,1fr))]',
	sm: 'sm:grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))]',
	md: 'md:grid-cols-[repeat(var(--cols-md),minmax(0,1fr))]',
	lg: 'lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))]',
	xl: 'xl:grid-cols-[repeat(var(--cols-xl),minmax(0,1fr))]',
	'2xl': '2xl:grid-cols-[repeat(var(--cols-2xl),minmax(0,1fr))]',
}

const rows: ClassMap = {
	initial: 'grid-rows-[repeat(var(--rows),minmax(0,1fr))]',
	sm: 'sm:grid-rows-[repeat(var(--rows-sm),minmax(0,1fr))]',
	md: 'md:grid-rows-[repeat(var(--rows-md),minmax(0,1fr))]',
	lg: 'lg:grid-rows-[repeat(var(--rows-lg),minmax(0,1fr))]',
	xl: 'xl:grid-rows-[repeat(var(--rows-xl),minmax(0,1fr))]',
	'2xl': '2xl:grid-rows-[repeat(var(--rows-2xl),minmax(0,1fr))]',
}

const gapMap = k.gap

const span: ClassMap = {
	initial: 'col-span-(--span)',
	sm: 'sm:col-span-(--span-sm)',
	md: 'md:col-span-(--span-md)',
	lg: 'lg:col-span-(--span-lg)',
	xl: 'xl:col-span-(--span-xl)',
	'2xl': '2xl:col-span-(--span-2xl)',
}

const spanFull: ClassMap = {
	initial: 'col-span-full',
	sm: 'sm:col-span-full',
	md: 'md:col-span-full',
	lg: 'lg:col-span-full',
	xl: 'xl:col-span-full',
	'2xl': '2xl:col-span-full',
}

const rowSpan: ClassMap = {
	initial: 'row-span-(--row-span)',
	sm: 'sm:row-span-(--row-span-sm)',
	md: 'md:row-span-(--row-span-md)',
	lg: 'lg:row-span-(--row-span-lg)',
	xl: 'xl:row-span-(--row-span-xl)',
	'2xl': '2xl:row-span-(--row-span-2xl)',
}

const colStart: ClassMap = {
	initial: 'col-start-(--col-start)',
	sm: 'sm:col-start-(--col-start-sm)',
	md: 'md:col-start-(--col-start-md)',
	lg: 'lg:col-start-(--col-start-lg)',
	xl: 'xl:col-start-(--col-start-xl)',
	'2xl': '2xl:col-start-(--col-start-2xl)',
}

const rowStart: ClassMap = {
	initial: 'row-start-(--row-start)',
	sm: 'sm:row-start-(--row-start-sm)',
	md: 'md:row-start-(--row-start-md)',
	lg: 'lg:row-start-(--row-start-lg)',
	xl: 'xl:row-start-(--row-start-xl)',
	'2xl': '2xl:row-start-(--row-start-2xl)',
}

const asNumber = (n: number) => n

export function resolveCols(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'cols', cols, asNumber)
}

export function resolveRows(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'rows', rows, asNumber)
}

// Literal breakpoint rows so the Tailwind scanner sources `sm:gap-2` etc.;
// interpolation (`${bp}:${cls}`) is invisible to it. `initial` reuses the kata.
const responsiveGapMap: Record<Breakpoint, Record<GridGap, string>> = {
	initial: gapMap,
	sm: { xs: 'sm:gap-1', sm: 'sm:gap-2', md: 'sm:gap-3', lg: 'sm:gap-4', xl: 'sm:gap-6' },
	md: { xs: 'md:gap-1', sm: 'md:gap-2', md: 'md:gap-3', lg: 'md:gap-4', xl: 'md:gap-6' },
	lg: { xs: 'lg:gap-1', sm: 'lg:gap-2', md: 'lg:gap-3', lg: 'lg:gap-4', xl: 'lg:gap-6' },
	xl: { xs: 'xl:gap-1', sm: 'xl:gap-2', md: 'xl:gap-3', lg: 'xl:gap-4', xl: 'xl:gap-6' },
	'2xl': { xs: '2xl:gap-1', sm: '2xl:gap-2', md: '2xl:gap-3', lg: '2xl:gap-4', xl: '2xl:gap-6' },
}

export function resolveGap(value: Responsive<GridGap> | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsiveGapMap[bp ?? 'initial'][v])
}

export function resolveRowSpan(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'row-span', rowSpan, asNumber)
}

export function resolveColStart(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'col-start', colStart, asNumber)
}

export function resolveRowStart(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'row-start', rowStart, asNumber)
}

/**
 * Span has two extras over a plain numeric prop:
 *   1. The literal `'full'` value, which spans the entire row regardless of
 *      column count (`grid-column: 1 / -1`). When the parent `Grid` declares
 *      a `columns` count, we instead mirror that count so the cell respects
 *      its `start` position and only spans up to the parent's grid.
 *   2. A responsive object may mix numeric values and `'full'` per breakpoint.
 */
export function resolveSpan(
	value: Responsive<number | 'full'> | undefined,
	columns: Responsive<number> | undefined,
): ResolvedResponsive {
	if (value === undefined) return EMPTY

	if (value === 'full') {
		if (columns === undefined) return { classes: [spanFull.initial], style: {} }

		return resolveScalar(columns, 'span', span, asNumber)
	}

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const obj: Partial<Record<Breakpoint, number | 'full'>> = value

		const classes: string[] = []

		const style: Record<string, string | number> = {}

		for (const bp of BREAKPOINTS) {
			const v = obj[bp]

			if (v === undefined) continue

			if (v === 'full') {
				classes.push(spanFull[bp])

				continue
			}

			classes.push(span[bp])

			style[varName('span', bp)] = v
		}

		return { classes, style: style as CSSProperties }
	}

	return resolveScalar(value as number, 'span', span, asNumber)
}

export const flowMap = {
	row: 'grid-flow-row',
	column: 'grid-flow-col',
	dense: 'grid-flow-dense',
} as const

export const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
} as const

export const justifyMap = {
	start: 'justify-items-start',
	center: 'justify-items-center',
	end: 'justify-items-end',
	stretch: 'justify-items-stretch',
} as const

export type { GridDividerVariants } from '../../recipes/kata/grid'

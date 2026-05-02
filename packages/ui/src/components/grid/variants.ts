import type { CSSProperties } from 'react'
import type { Ma } from '../../recipes/ryu/ma'
import { BREAKPOINTS, type Breakpoint, type Responsive } from '../../types'

export type { Responsive }

export type GridGap = Ma

export function resolveResponsive<T>(
	value: Responsive<T> | undefined,
	resolver: (v: T, bp?: string) => string,
): string[] {
	if (value === undefined) return []

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const obj = value as Record<string, T>

		const classes: string[] = []

		for (const [bp, v] of Object.entries(obj)) {
			if (v === undefined) continue

			classes.push(resolver(v, bp === 'initial' ? undefined : bp))
		}

		return classes
	}

	return [resolver(value as T)]
}

// ─── Scalar resolver ────────────────────────────────────────────────────────
//
// For grid props that accept a numeric value (`columns`, `rows`, `span`,
// `rowSpan`, `start`, `rowStart`), we route the runtime value through a CSS
// custom property and apply a *static* Tailwind utility that reads it.
//
// Each breakpoint owns a distinct variable (`--cols`, `--cols-sm`, …) so we
// only emit the override class when the user provides a value at that
// breakpoint — Tailwind's mobile-first cascade handles "no override"
// automatically. The result: a fixed set of literal class strings that the
// JIT scanner sees, and arbitrary numeric values at runtime — no safelist.

type ClassMap = Record<Breakpoint, string>

export type ResolvedResponsive = {
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
		for (const bp of BREAKPOINTS) {
			const v = (value as Record<string, T | undefined>)[bp]

			if (v === undefined) continue

			classes.push(classMap[bp])

			style[varName(prefix, bp)] = toCss(v)
		}
	} else {
		classes.push(classMap.initial)

		style[varName(prefix, 'initial')] = toCss(value as T)
	}

	return { classes, style: style as CSSProperties }
}

// ─── Class maps ─────────────────────────────────────────────────────────────
//
// Every entry is a literal string the Tailwind scanner can see verbatim.

const COLS: ClassMap = {
	initial: 'grid-cols-[repeat(var(--cols),minmax(0,1fr))]',
	sm: 'sm:grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))]',
	md: 'md:grid-cols-[repeat(var(--cols-md),minmax(0,1fr))]',
	lg: 'lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))]',
	xl: 'xl:grid-cols-[repeat(var(--cols-xl),minmax(0,1fr))]',
	'2xl': '2xl:grid-cols-[repeat(var(--cols-2xl),minmax(0,1fr))]',
}

const ROWS: ClassMap = {
	initial: 'grid-rows-[repeat(var(--rows),minmax(0,1fr))]',
	sm: 'sm:grid-rows-[repeat(var(--rows-sm),minmax(0,1fr))]',
	md: 'md:grid-rows-[repeat(var(--rows-md),minmax(0,1fr))]',
	lg: 'lg:grid-rows-[repeat(var(--rows-lg),minmax(0,1fr))]',
	xl: 'xl:grid-rows-[repeat(var(--rows-xl),minmax(0,1fr))]',
	'2xl': '2xl:grid-rows-[repeat(var(--rows-2xl),minmax(0,1fr))]',
}

const GAP_MAP = {
	xs: 'gap-xs',
	sm: 'gap-sm',
	md: 'gap-md',
	lg: 'gap-lg',
	xl: 'gap-xl',
} as const satisfies Record<GridGap, string>

const SPAN: ClassMap = {
	initial: 'col-span-(--span)',
	sm: 'sm:col-span-(--span-sm)',
	md: 'md:col-span-(--span-md)',
	lg: 'lg:col-span-(--span-lg)',
	xl: 'xl:col-span-(--span-xl)',
	'2xl': '2xl:col-span-(--span-2xl)',
}

const SPAN_FULL: ClassMap = {
	initial: 'col-span-full',
	sm: 'sm:col-span-full',
	md: 'md:col-span-full',
	lg: 'lg:col-span-full',
	xl: 'xl:col-span-full',
	'2xl': '2xl:col-span-full',
}

const ROW_SPAN: ClassMap = {
	initial: 'row-span-(--row-span)',
	sm: 'sm:row-span-(--row-span-sm)',
	md: 'md:row-span-(--row-span-md)',
	lg: 'lg:row-span-(--row-span-lg)',
	xl: 'xl:row-span-(--row-span-xl)',
	'2xl': '2xl:row-span-(--row-span-2xl)',
}

const COL_START: ClassMap = {
	initial: 'col-start-(--col-start)',
	sm: 'sm:col-start-(--col-start-sm)',
	md: 'md:col-start-(--col-start-md)',
	lg: 'lg:col-start-(--col-start-lg)',
	xl: 'xl:col-start-(--col-start-xl)',
	'2xl': '2xl:col-start-(--col-start-2xl)',
}

const ROW_START: ClassMap = {
	initial: 'row-start-(--row-start)',
	sm: 'sm:row-start-(--row-start-sm)',
	md: 'md:row-start-(--row-start-md)',
	lg: 'lg:row-start-(--row-start-lg)',
	xl: 'xl:row-start-(--row-start-xl)',
	'2xl': '2xl:row-start-(--row-start-2xl)',
}

// ─── Public resolvers ───────────────────────────────────────────────────────

const asNumber = (n: number) => n

export function resolveCols(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'cols', COLS, asNumber)
}

export function resolveRows(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'rows', ROWS, asNumber)
}

export function resolveGap(value: Responsive<GridGap> | undefined): string[] {
	return resolveResponsive(value, (v, bp) => {
		const cls = GAP_MAP[v]

		return bp ? `${bp}:${cls}` : cls
	})
}

export function resolveRowSpan(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'row-span', ROW_SPAN, asNumber)
}

export function resolveColStart(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'col-start', COL_START, asNumber)
}

export function resolveRowStart(value: Responsive<number> | undefined): ResolvedResponsive {
	return resolveScalar(value, 'row-start', ROW_START, asNumber)
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
		if (columns === undefined) return { classes: [SPAN_FULL.initial], style: {} }

		return resolveScalar(columns, 'span', SPAN, asNumber)
	}

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const classes: string[] = []

		const style: Record<string, string | number> = {}

		for (const bp of BREAKPOINTS) {
			const v = (value as Record<string, number | 'full' | undefined>)[bp]

			if (v === undefined) continue

			if (v === 'full') {
				classes.push(SPAN_FULL[bp])

				continue
			}

			classes.push(SPAN[bp])

			style[varName('span', bp)] = v
		}

		return { classes, style: style as CSSProperties }
	}

	return resolveScalar(value as number, 'span', SPAN, asNumber)
}

// ─── Lookup maps ────────────────────────────────────────────────────────────

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

// ─── Divider variants ───────────────────────────────────────────────────────

export {
	type GridDividerVariants,
	gridDivider as gridDividerVariants,
} from '../../recipes/kata/grid'

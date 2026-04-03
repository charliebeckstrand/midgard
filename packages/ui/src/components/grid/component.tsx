import type React from 'react'
import { cn } from '../../core'

// ─── Grid ────────────────────────────────────────────────────────────────────

type Responsive<T> = T | { initial?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }

export type GridProps = {
	columns?: Responsive<number>
	rows?: Responsive<number>
	gap?: Responsive<number>
	flow?: 'row' | 'column' | 'dense'
	align?: 'start' | 'center' | 'end' | 'stretch'
	justify?: 'start' | 'center' | 'end' | 'stretch'
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

function resolveResponsive<T>(
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

function colClass(n: number, bp?: string): string {
	const cls = `grid-cols-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function rowClass(n: number, bp?: string): string {
	const cls = `grid-rows-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function gapClass(n: number, bp?: string): string {
	const cls = `gap-${n}`

	return bp ? `${bp}:${cls}` : cls
}

const flowMap = {
	row: 'grid-flow-row',
	column: 'grid-flow-col',
	dense: 'grid-flow-dense',
}

const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
}

const justifyMap = {
	start: 'justify-items-start',
	center: 'justify-items-center',
	end: 'justify-items-end',
	stretch: 'justify-items-stretch',
}

function GridRoot({
	columns,
	rows,
	gap = 4,
	flow,
	align,
	justify,
	className,
	children,
	...props
}: GridProps) {
	const classes = cn(
		'grid',
		...resolveResponsive(columns, colClass),
		...resolveResponsive(rows, rowClass),
		...resolveResponsive(gap, gapClass),
		flow && flowMap[flow],
		align && alignMap[align],
		justify && justifyMap[justify],
		className,
	)

	return (
		<div data-slot="grid" className={classes} {...props}>
			{children}
		</div>
	)
}

// ─── Grid.Cell ───────────────────────────────────────────────────────────────

export type GridCellProps = {
	span?: Responsive<number>
	rowSpan?: Responsive<number>
	start?: Responsive<number>
	rowStart?: Responsive<number>
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

function colSpanClass(n: number, bp?: string): string {
	const cls = `col-span-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function rowSpanClass(n: number, bp?: string): string {
	const cls = `row-span-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function colStartClass(n: number, bp?: string): string {
	const cls = `col-start-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function rowStartClass(n: number, bp?: string): string {
	const cls = `row-start-${n}`

	return bp ? `${bp}:${cls}` : cls
}

function GridCell({
	span,
	rowSpan,
	start,
	rowStart,
	className,
	children,
	...props
}: GridCellProps) {
	const classes = cn(
		...resolveResponsive(span, colSpanClass),
		...resolveResponsive(rowSpan, rowSpanClass),
		...resolveResponsive(start, colStartClass),
		...resolveResponsive(rowStart, rowStartClass),
		className,
	)

	return (
		<div data-slot="grid-cell" className={classes} {...props}>
			{children}
		</div>
	)
}

// ─── Compound export ─────────────────────────────────────────────────────────

const Grid = Object.assign(GridRoot, { Cell: GridCell })

export { Grid }

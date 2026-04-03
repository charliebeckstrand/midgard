'use client'

import type React from 'react'
import { cn } from '../../core'
import { GridProvider, useGrid } from './context'
import {
	alignMap,
	flowMap,
	gridDividerVariants,
	justifyMap,
	type Responsive,
	resolveResponsive,
	responsiveClass,
} from './variants'

// ─── Grid ────────────────────────────────────────────────────────────────────

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

export function Grid({
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
	return (
		<GridProvider value={{ columns, gap }}>
			<div
				data-slot="grid"
				className={cn(
					'grid',
					...resolveResponsive(columns, responsiveClass('grid-cols')),
					...resolveResponsive(rows, responsiveClass('grid-rows')),
					...resolveResponsive(gap, responsiveClass('gap')),
					flow && flowMap[flow],
					align && alignMap[align],
					justify && justifyMap[justify],
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</GridProvider>
	)
}

// ─── GridCell ────────────────────────────────────────────────────────────────

export type GridCellProps = {
	span?: Responsive<number | 'full'>
	rowSpan?: Responsive<number>
	start?: Responsive<number>
	rowStart?: Responsive<number>
	area?: string
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

function resolveFullSpan(columns: Responsive<number> | undefined): string[] {
	if (!columns) return ['col-span-full']

	return resolveResponsive(columns, (n, bp) => {
		const cls = `col-span-${n}`
		return bp ? `${bp}:${cls}` : cls
	})
}

function resolveSpan(
	value: Responsive<number | 'full'> | undefined,
	columns: Responsive<number> | undefined,
): string[] {
	if (value === undefined) return []
	if (value === 'full') return resolveFullSpan(columns)

	return resolveResponsive(value as Responsive<number>, responsiveClass('col-span'))
}

export function GridCell({
	span,
	rowSpan,
	start,
	rowStart,
	area,
	className,
	children,
	...props
}: GridCellProps) {
	const ctx = useGrid()
	const columns = ctx?.columns

	return (
		<div
			data-slot="grid-cell"
			className={cn(
				...resolveSpan(span, columns),
				...resolveResponsive(rowSpan, responsiveClass('row-span')),
				...resolveResponsive(start, responsiveClass('col-start')),
				...resolveResponsive(rowStart, responsiveClass('row-start')),
				area && `[grid-area:${area}]`,
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

// ─── GridDivider ─────────────────────────────────────────────────────────────

export type GridDividerProps = {
	soft?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'hr'>, 'className'>

export function GridDivider({ soft, className, ...props }: GridDividerProps) {
	return (
		<hr
			data-slot="grid-divider"
			className={cn(gridDividerVariants({ soft }), className)}
			{...props}
		/>
	)
}

'use client'

import type React from 'react'
import { cn } from '../../core'
import { useGrid } from './context'
import { type Responsive, resolveResponsive, responsiveClass } from './variants'

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

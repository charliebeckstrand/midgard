'use client'

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { useDensityNullable } from '../../primitives/density'
import {
	alignMap,
	flowMap,
	type GridGap,
	justifyMap,
	type Responsive,
	resolveCols,
	resolveGap,
	resolveRows,
} from './variants'

export type GridProps = {
	columns?: Responsive<number>
	rows?: Responsive<number>
	gap?: Responsive<GridGap>
	flow?: 'row' | 'column' | 'dense'
	align?: 'start' | 'center' | 'end' | 'stretch'
	justify?: 'start' | 'center' | 'end' | 'stretch'
	className?: string
	style?: CSSProperties
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children' | 'style'>

/**
 * CSS grid container with responsive `columns`, `rows`, and `gap` — `gap`
 * falls back to enclosing Density then `'md'`, and the resolved `columns` flow
 * down through context to child items.
 */
export function Grid({
	columns,
	rows,
	gap,
	flow,
	align,
	justify,
	className,
	style,
	children,
	...props
}: GridProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.space ?? 'md'

	const cols = resolveCols(columns)
	const resolvedRows = resolveRows(rows)

	return (
		<div
			data-slot="grid"
			className={cn(
				'grid',
				...cols.classes,
				...resolvedRows.classes,
				...resolveGap(resolvedGap),
				flow && flowMap[flow],
				align && alignMap[align],
				justify && justifyMap[justify],
				className,
			)}
			style={{ ...cols.style, ...resolvedRows.style, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

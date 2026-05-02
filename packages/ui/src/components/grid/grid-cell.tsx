'use client'

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { useGrid } from './context'
import {
	type Responsive,
	resolveColStart,
	resolveRowSpan,
	resolveRowStart,
	resolveSpan,
} from './variants'

export type GridCellProps = {
	span?: Responsive<number | 'full'>
	rowSpan?: Responsive<number>
	start?: Responsive<number>
	rowStart?: Responsive<number>
	area?: string
	className?: string
	style?: CSSProperties
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children' | 'style'>

export function GridCell({
	span,
	rowSpan,
	start,
	rowStart,
	area,
	className,
	style,
	children,
	...props
}: GridCellProps) {
	const ctx = useGrid()

	const sp = resolveSpan(span, ctx?.columns)
	const rs = resolveRowSpan(rowSpan)
	const cs = resolveColStart(start)
	const rss = resolveRowStart(rowStart)

	return (
		<div
			data-slot="grid-cell"
			className={cn(...sp.classes, ...rs.classes, ...cs.classes, ...rss.classes, className)}
			style={{
				...sp.style,
				...rs.style,
				...cs.style,
				...rss.style,
				...(area !== undefined && { gridArea: area }),
				...style,
			}}
			{...props}
		>
			{children}
		</div>
	)
}

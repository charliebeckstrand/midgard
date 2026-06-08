'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensityNullable } from '../../primitives/density'
import {
	alignMap,
	gapMap,
	ratioTuples,
	type SplitAlign,
	type SplitDirection,
	type SplitGap,
	type SplitRatio,
} from './variants'

export type SplitProps = {
	/** Split direction. Defaults to `horizontal` (two columns). */
	direction?: SplitDirection
	/**
	 * Ratio of the first pane to the second pane. Defaults to `1/2`
	 * (equal split).
	 */
	ratio?: SplitRatio
	/**
	 * Gap between the two panes. Resolves through
	 * `explicit ?? Density.space ?? 'lg'`, so a Split inside a Density
	 * provider inherits the matching spacing step without further wiring.
	 */
	gap?: SplitGap
	/** Cross-axis alignment. */
	align?: SplitAlign
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Two-pane grid layout — `direction` chooses rows or columns and `ratio` sizes the first pane against the second. */
export function Split({
	direction = 'horizontal',
	ratio = '1/2',
	gap,
	align,
	className,
	style,
	children,
	...props
}: SplitProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.space ?? 'lg'

	const [a, b] = ratioTuples[ratio]
	const template = `${a}fr ${b}fr`

	const ratioStyle =
		direction === 'horizontal' ? { gridTemplateColumns: template } : { gridTemplateRows: template }

	return (
		<div
			data-slot="split"
			className={cn('grid', gapMap[resolvedGap], align && alignMap[align], className)}
			style={{ ...ratioStyle, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

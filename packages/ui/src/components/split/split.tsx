'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensityNullable } from '../../primitives/density'
import {
	alignMap,
	gapMap,
	ratioTuples,
	type SplitAlign,
	type SplitGap,
	type SplitOrientation,
	type SplitRatio,
} from './variants'

export type SplitProps = {
	/** Split orientation. Defaults to `horizontal` (two columns). */
	orientation?: SplitOrientation
	/**
	 * Ratio of the first pane to the second pane. Defaults to `1/2`
	 * (equal split).
	 */
	ratio?: SplitRatio
	/**
	 * Gap between the two panes. Resolves through
	 * `explicit ?? Density.space ?? 'lg'`; a Split inside a Density
	 * provider inherits the matching spacing step.
	 */
	gap?: SplitGap
	/** Cross-axis alignment. */
	align?: SplitAlign
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Two-pane grid layout. `orientation` chooses rows or columns and `ratio` sizes the first pane against the second. */
export function Split({
	orientation = 'horizontal',
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
		orientation === 'horizontal'
			? { gridTemplateColumns: template }
			: { gridTemplateRows: template }

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

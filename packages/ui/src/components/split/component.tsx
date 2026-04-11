import type React from 'react'
import { cn } from '../../core'
import {
	gapMap,
	ratioTuples,
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
	/** Gap between the two panes. Defaults to `4`. */
	gap?: SplitGap
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Split({
	direction = 'horizontal',
	ratio = '1/2',
	gap = 4,
	className,
	style,
	children,
	...props
}: SplitProps) {
	const [a, b] = ratioTuples[ratio]
	const template = `${a}fr ${b}fr`

	const ratioStyle =
		direction === 'horizontal' ? { gridTemplateColumns: template } : { gridTemplateRows: template }

	return (
		<div
			data-slot="split"
			className={cn('grid', gapMap[gap], className)}
			style={{ ...ratioStyle, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

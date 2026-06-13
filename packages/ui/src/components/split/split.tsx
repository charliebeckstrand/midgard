import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import {
	alignMap,
	gapMap,
	ratioTuples,
	type SplitAlign,
	type SplitGap,
	type SplitOrientation,
	type SplitRatio,
} from './variants'

/** Props for {@link Split}: layout knobs (`orientation`, `ratio`, `gap`, `align`) plus `<div>` attributes. */
export type SplitProps = {
	/** Split orientation. @default 'horizontal' (two columns) */
	orientation?: SplitOrientation
	/**
	 * Ratio of the first pane to the second pane. @default '1/2' (equal split)
	 */
	ratio?: SplitRatio
	/** Gap between the two panes. Explicit. @default 'lg' */
	gap?: SplitGap
	/** Cross-axis alignment. */
	align?: SplitAlign
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Two-pane CSS-grid layout. `orientation` chooses columns or rows, `ratio`
 * sizes the first pane against the second via `fr` tracks, and `gap` (explicit,
 * defaulting to `lg`) and `align` tune spacing and cross-axis placement.
 * Expects exactly two children. A static leaf with no client hooks, so it
 * renders in React Server Components.
 */
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
	const resolvedGap = gap ?? 'lg'

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

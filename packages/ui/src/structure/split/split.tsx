import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/split'
import type {
	ResponsiveSplitAlign,
	ResponsiveSplitGap,
	ResponsiveSplitOrientation,
	ResponsiveSplitRatio,
} from './variants'

/** Props for {@link Split}: layout knobs (`orientation`, `ratio`, `gap`, `align`) plus `<div>` attributes. */
export type SplitProps = {
	/**
	 * The orientation of the split: two columns (`horizontal`) or two rows
	 * (`vertical`). Supports responsive breakpoints, so a two-column split can
	 * stack on a phone.
	 * @defaultValue 'horizontal'
	 */
	orientation?: ResponsiveSplitOrientation
	/**
	 * The size of the first pane relative to the second; `'1/2'` is an equal
	 * split. Supports responsive breakpoints.
	 * @defaultValue '1/2'
	 */
	ratio?: ResponsiveSplitRatio
	/**
	 * The gap between the two panes. Supports responsive breakpoints.
	 * @defaultValue 'lg'
	 */
	gap?: ResponsiveSplitGap
	/**
	 * The block alignment of each pane in its grid track. Supports responsive
	 * breakpoints.
	 * @defaultValue No alignment: each pane stretches to fill its track.
	 */
	align?: ResponsiveSplitAlign
} & ComponentProps<'div'>

/**
 * A grid of two panes. `orientation` chooses columns or rows, and `ratio`
 * sizes the first pane against the second with `fr` tracks. `gap` sets the
 * space between the panes, and `align` sets the block alignment of each pane.
 * It expects exactly two children.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function Split({
	orientation,
	ratio,
	gap,
	align,
	className,
	children,
	...props
}: SplitProps) {
	return (
		<div
			data-slot="split"
			{...props}
			className={cn(k({ orientation, ratio, gap, align }).base, className)}
		>
			{children}
		</div>
	)
}

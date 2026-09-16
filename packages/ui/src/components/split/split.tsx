import type { ComponentProps } from 'react'
import { cn } from '../../core'
import {
	type ResponsiveSplitAlign,
	type ResponsiveSplitGap,
	type ResponsiveSplitOrientation,
	type ResponsiveSplitRatio,
	resolveAlign,
	resolveGap,
	resolveTemplate,
} from './variants'

/** Props for {@link Split}: layout knobs (`orientation`, `ratio`, `gap`, `align`) plus `<div>` attributes. */
export type SplitProps = {
	/**
	 * Split orientation: two columns (`horizontal`) or two rows (`vertical`).
	 * Supports responsive breakpoints, so a two-column split can stack on a
	 * phone.
	 * @defaultValue 'horizontal'
	 */
	orientation?: ResponsiveSplitOrientation
	/**
	 * Size of the first pane relative to the second; `'1/2'` is an equal split.
	 * Supports responsive breakpoints.
	 * @defaultValue '1/2'
	 */
	ratio?: ResponsiveSplitRatio
	/**
	 * Gap between the two panes. Supports responsive breakpoints.
	 * @defaultValue 'lg'
	 */
	gap?: ResponsiveSplitGap
	/** Cross-axis alignment. Supports responsive breakpoints. */
	align?: ResponsiveSplitAlign
	className?: string
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Two-pane CSS-grid layout. `orientation` chooses columns or rows, and `ratio`
 * sizes the first pane against the second via `fr` tracks. `gap` and `align`
 * tune spacing and cross-axis placement; `gap` is explicit and defaults to
 * `lg`.
 * Expects exactly two children. A static leaf with no client hooks, so it
 * renders in React Server Components.
 */
export function Split({
	orientation = 'horizontal',
	ratio = '1/2',
	gap = 'lg',
	align,
	className,
	children,
	...props
}: SplitProps) {
	return (
		<div
			{...props}
			data-slot="split"
			className={cn(
				'grid',
				resolveTemplate(orientation, ratio),
				resolveGap(gap),
				resolveAlign(align),
				className,
			)}
		>
			{children}
		</div>
	)
}

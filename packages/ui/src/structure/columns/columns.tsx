import type { ComponentProps } from 'react'
import { cn } from '../../core'
import {
	type ResponsiveColumnCount,
	type ResponsiveColumnsAlign,
	type ResponsiveColumnsGap,
	resolveAlign,
	resolveColumns,
	resolveGap,
} from './variants'

/** Props for {@link Columns}: `columns`, `gap`, and `align`, plus `<div>` attributes. */
export type ColumnsProps = {
	/**
	 * The count of equal columns. Supports responsive breakpoints, so a grid
	 * can have one column on a phone and more on a wide screen.
	 * @defaultValue 1
	 */
	columns?: ResponsiveColumnCount
	/**
	 * The gap between the cells, on the scale of the `gap` of Flex. Supports
	 * responsive breakpoints. The gap takes the step of the nearest density
	 * scope.
	 * @defaultValue 'lg'
	 */
	gap?: ResponsiveColumnsGap
	/** The block alignment of each cell in its row. Supports responsive breakpoints. */
	align?: ResponsiveColumnsAlign
	className?: string
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * A grid of equal columns. `columns` sets the count of the columns, and `gap`
 * sets the space between the cells on the shared spacing scale. Use it in place
 * of a `grid` class with a `gap` class, so the gap follows density. Use
 * {@link Split} for two panes with a ratio.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function Columns({
	columns = 1,
	gap = 'lg',
	align,
	className,
	children,
	...props
}: ColumnsProps) {
	return (
		<div
			data-slot="columns"
			className={cn(
				'grid',
				resolveColumns(columns),
				resolveGap(gap),
				resolveAlign(align),
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

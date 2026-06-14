import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
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

/** Props for {@link Grid}: responsive `columns`/`rows`/`gap` plus `flow`, `align`, and `justify` atop native `<div>` attributes. */
export type GridProps = {
	columns?: Responsive<number>
	rows?: Responsive<number>
	/** @defaultValue 'md' */
	gap?: Responsive<GridGap>
	flow?: 'row' | 'column' | 'dense'
	align?: 'start' | 'center' | 'end' | 'stretch'
	justify?: 'start' | 'center' | 'end' | 'stretch'
	className?: string
	style?: CSSProperties
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children' | 'style'>

/**
 * CSS grid container with responsive `columns`, `rows`, and `gap`, plus
 * `flow`, item `align`, and `justify`. Numeric tracks thread through CSS
 * custom properties so arbitrary counts work without a Tailwind safelist.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
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
	const resolvedGap = gap ?? 'md'

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

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import {
	type Responsive,
	resolveColStart,
	resolveRowSpan,
	resolveRowStart,
	resolveSpan,
} from './variants'

/** Props for {@link GridCell}: responsive column/row `span` and `start` placement, or a named grid `area`, atop native `<div>` attributes. */
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

/**
 * Grid item that places itself within a {@link Grid} via responsive column/row
 * `span` and `start` lines, or a named template `area`. `span` accepts `'full'`
 * to span the whole row; placement threads through CSS custom properties.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
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
	const sp = resolveSpan(span)
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

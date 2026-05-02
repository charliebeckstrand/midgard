import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { GridProvider } from './context'
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

export type GridProps = {
	columns?: Responsive<number>
	rows?: Responsive<number>
	gap?: Responsive<GridGap>
	flow?: 'row' | 'column' | 'dense'
	align?: 'start' | 'center' | 'end' | 'stretch'
	justify?: 'start' | 'center' | 'end' | 'stretch'
	className?: string
	style?: CSSProperties
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children' | 'style'>

export function Grid({
	columns,
	rows,
	gap = 'md',
	flow,
	align,
	justify,
	className,
	style,
	children,
	...props
}: GridProps) {
	const cols = resolveCols(columns)
	const rws = resolveRows(rows)

	return (
		<GridProvider value={{ columns }}>
			<div
				data-slot="grid"
				className={cn(
					'grid',
					...cols.classes,
					...rws.classes,
					...resolveGap(gap),
					flow && flowMap[flow],
					align && alignMap[align],
					justify && justifyMap[justify],
					className,
				)}
				style={{ ...cols.style, ...rws.style, ...style }}
				{...props}
			>
				{children}
			</div>
		</GridProvider>
	)
}

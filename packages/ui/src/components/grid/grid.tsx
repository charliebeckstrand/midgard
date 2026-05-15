import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives/concentric'
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
	gap,
	flow,
	align,
	justify,
	className,
	style,
	children,
	...props
}: GridProps) {
	const concentric = useConcentric()

	const resolvedGap = gap ?? concentric?.size ?? 'md'

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
					...resolveGap(resolvedGap),
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

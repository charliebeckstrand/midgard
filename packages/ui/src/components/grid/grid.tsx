import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { GridProvider } from './context'
import {
	alignMap,
	flowMap,
	justifyMap,
	type Responsive,
	resolveResponsive,
	responsiveClass,
} from './variants'

export type GridProps = {
	columns?: Responsive<number>
	rows?: Responsive<number>
	gap?: Responsive<number>
	flow?: 'row' | 'column' | 'dense'
	align?: 'start' | 'center' | 'end' | 'stretch'
	justify?: 'start' | 'center' | 'end' | 'stretch'
	className?: string
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Grid({
	columns,
	rows,
	gap = 4,
	flow,
	align,
	justify,
	className,
	children,
	...props
}: GridProps) {
	return (
		<GridProvider value={{ columns, gap }}>
			<div
				data-slot="grid"
				className={cn(
					'grid',
					...resolveResponsive(columns, responsiveClass('grid-cols')),
					...resolveResponsive(rows, responsiveClass('grid-rows')),
					...resolveResponsive(gap, responsiveClass('gap')),
					flow && flowMap[flow],
					align && alignMap[align],
					justify && justifyMap[justify],
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</GridProvider>
	)
}

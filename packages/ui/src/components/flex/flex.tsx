'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensityNullable } from '../../primitives/density'
import { defaultAlignFromDirection } from './flex-utilities'
import {
	type ResponsiveAlign,
	type ResponsiveDirection,
	type ResponsiveGap,
	type ResponsiveJustify,
	resolveAlign,
	resolveDirection,
	resolveGap,
	resolveJustify,
} from './variants'

export type FlexProps = {
	/** Flex direction. Supports responsive breakpoints. */
	direction?: ResponsiveDirection
	/** Gap between children. Supports responsive breakpoints. */
	gap?: ResponsiveGap
	/** Cross-axis alignment. Supports responsive breakpoints. */
	align?: ResponsiveAlign
	/** Main-axis alignment. Supports responsive breakpoints. */
	justify?: ResponsiveJustify
	/** Allow children to wrap onto multiple lines. */
	wrap?: boolean
	/** Fill available space. `'1'` is `flex: 1 1 0%`; `'auto'` is `flex: 1 1 auto`. */
	flex?: '1' | 'auto' | false
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Spans full width of parent. */
	full?: boolean
	/** Stretches all children equally. */
	equal?: boolean
	className?: string
	[key: `data-${string}`]: string | number | boolean | undefined
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Horizontal flex container. Use Flex for rows, Stack for columns.
 *
 * `gap` resolves through `explicit ?? Density.space`; a Flex inside a
 * Density-providing ancestor (Card, Drawer, `<Density>`, …) inherits the
 * matching spacing step. Outside any provider, `gap` stays unset.
 */
export function Flex({
	direction = 'row',
	gap,
	align,
	justify,
	wrap,
	flex,
	inline,
	full,
	equal,
	className,
	children,
	...props
}: FlexProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.space

	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return (
		<div
			data-slot="flex"
			className={cn(
				resolveDirection(direction),
				resolveAlign(resolvedAlign),
				resolveGap(resolvedGap),
				resolveJustify(justify),
				wrap && 'flex-wrap',
				full && 'w-full',
				flex === '1' && 'flex-1',
				flex === 'auto' && 'flex-auto',
				equal && '*:flex-1',
				inline ? 'inline-flex' : 'flex',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

import type React from 'react'
import { cn } from '../../core'
import {
	type FlexGap,
	type FlexJustify,
	type FlexWidth,
	gapMap,
	justifyMap,
	type ResponsiveAlign,
	type ResponsiveDirection,
	resolveAlign,
	resolveDirection,
	widthMap,
} from './variants'

export type FlexProps = {
	/** Flex direction. Supports responsive breakpoints. Defaults to row. */
	direction?: ResponsiveDirection
	/** Gap between children. */
	gap?: FlexGap
	/** Cross-axis alignment. Supports responsive breakpoints. Defaults to center. */
	align?: ResponsiveAlign
	/** Main-axis alignment. */
	justify?: FlexJustify
	/** Allow children to wrap onto multiple lines. */
	wrap?: boolean
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Optional width constraint. */
	width?: FlexWidth
	/** Fills available space (flex: 1 1 0%). */
	flex?: boolean
	/** Stretches all children equally. */
	equal?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/** Horizontal flex container. Use Flex for rows, Stack for columns. */
export function Flex({
	direction = 'row',
	gap,
	align = 'center',
	justify,
	wrap,
	inline,
	width,
	flex,
	equal,
	className,
	children,
	...props
}: FlexProps) {
	return (
		<div
			data-slot="flex"
			className={cn(
				inline ? 'inline-flex' : 'flex',
				width && widthMap[width],
				resolveDirection(direction),
				resolveAlign(align),
				gap !== undefined && gapMap[gap],
				justify && justifyMap[justify],
				wrap && 'flex-wrap',
				flex && 'flex-1',
				equal && '*:flex-1',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

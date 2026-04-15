import type React from 'react'
import { cn } from '../../core'
import {
	type FlexAlign,
	type FlexDirection,
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
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Spans full width of parent. */
	full?: boolean
	/** Fills available space (flex: 1 1 0%). */
	flex?: boolean
	/** Stretches all children equally. */
	equal?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/** @internal Shared flex implementation used by Flex and Stack. */
export function FlexBase({
	dataSlot,
	direction,
	gap,
	align,
	justify,
	wrap,
	inline,
	full,
	flex,
	equal,
	className,
	children,
	...props
}: FlexProps & { dataSlot?: string }) {
	return (
		<div
			data-slot={dataSlot}
			className={cn(
				resolveDirection(direction),
				resolveAlign(align),
				resolveGap(gap),
				resolveJustify(justify),
				wrap && 'flex-wrap',
				full && 'w-full',
				flex && 'flex-1',
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

function alignForDirection(dir: FlexDirection): FlexAlign {
	return dir === 'col' || dir === 'col-reverse' ? 'start' : 'center'
}

function defaultAlignFromDirection(direction: ResponsiveDirection): ResponsiveAlign {
	if (typeof direction === 'string') return alignForDirection(direction)

	const align: Record<string, FlexAlign> = {}

	for (const [bp, dir] of Object.entries(direction)) {
		if (dir !== undefined) align[bp] = alignForDirection(dir)
	}

	return align
}

/** Horizontal flex container. Use Flex for rows, Stack for columns. */
export function Flex({ direction = 'row', align, ...props }: FlexProps) {
	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return <FlexBase dataSlot="flex" direction={direction} align={resolvedAlign} {...props} />
}

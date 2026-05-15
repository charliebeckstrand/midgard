import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives/concentric'
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
	/** Fills available space (flex: 1 1 0%). */
	flex?: boolean
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Spans full width of parent. */
	full?: boolean
	/** Fills available space (flex: 1 1 auto). */
	grow?: boolean
	/** Stretches all children equally. */
	equal?: boolean
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** @internal Shared flex implementation used by Flex and Stack. */
export function FlexBase({
	dataSlot,
	direction,
	gap,
	align,
	justify,
	wrap,
	flex,
	inline,
	full,
	grow,
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
				grow && 'grow',
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

/**
 * Horizontal flex container. Use Flex for rows, Stack for columns.
 *
 * `gap` resolves through `explicit ?? Concentric` — a Flex inside a
 * Concentric-providing ancestor (Card, Drawer, `<Density>`, …) inherits the
 * matching spacing step. Outside any provider, `gap` stays unset.
 */
export function Flex({ direction = 'row', align, gap, ...props }: FlexProps) {
	const concentric = useConcentric()

	const resolvedGap = gap ?? concentric?.size

	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return (
		<FlexBase
			dataSlot="flex"
			direction={direction}
			align={resolvedAlign}
			gap={resolvedGap}
			{...props}
		/>
	)
}

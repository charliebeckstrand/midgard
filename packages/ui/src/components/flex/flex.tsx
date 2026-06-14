import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
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

/** Props for {@link Flex}: responsive direction/gap/alignment plus wrap, fill, and inline modifiers atop native `<div>` attributes. */
export type FlexProps = {
	/**
	 * Flex direction. Supports responsive breakpoints.
	 *
	 * @defaultValue 'row'
	 */
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
 * Flex container with responsive `direction`, `gap`, `align`, and `justify`,
 * plus `wrap`, `inline`, `full`-width, `flex`-fill, and `equal` (stretch
 * children) modifiers. Use Flex for rows, Stack for columns; cross-axis
 * `align` defaults from `direction` when unset.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 * `gap` is explicit; omitted, it stays unset.
 *
 * @see {@link Stack} for the column-direction shorthand.
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
	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return (
		<div
			data-slot="flex"
			className={cn(
				resolveDirection(direction),
				resolveAlign(resolvedAlign),
				resolveGap(gap),
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

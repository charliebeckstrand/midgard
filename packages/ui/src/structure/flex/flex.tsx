import type { ComponentProps } from 'react'
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

/** Props for {@link Flex}: responsive direction/gap/alignment plus wrap and fill modifiers atop native `<div>` attributes. */
export type FlexProps = {
	/**
	 * The element to render. Set `'span'` to lay out phrasing content, such as
	 * the label of a button or of a list row that is a button. A `<div>` there
	 * is not valid HTML.
	 *
	 * @defaultValue 'div'
	 */
	as?: 'div' | 'span'
	/**
	 * Flex direction. Supports responsive breakpoints.
	 *
	 * @defaultValue 'row'
	 */
	direction?: ResponsiveDirection
	/**
	 * Gap between children. Supports responsive breakpoints. The gap takes the
	 * step of the nearest density scope: a stop has its value at `md`, the stop
	 * below at `sm`, and the stop above at `lg`.
	 */
	gap?: ResponsiveGap
	/** Cross-axis alignment. Supports responsive breakpoints. */
	align?: ResponsiveAlign
	/** Main-axis alignment. Supports responsive breakpoints. */
	justify?: ResponsiveJustify
	/**
	 * Allow children to wrap onto multiple lines.
	 * @defaultValue false
	 */
	wrap?: boolean
	/**
	 * Fill available space. `'1'` is `flex: 1 1 0%`; `'auto'` is `flex: 1 1 auto`.
	 * @defaultValue false
	 */
	flex?: '1' | 'auto' | false
	/**
	 * Spans full width of parent.
	 * @defaultValue false
	 */
	full?: boolean
	className?: string
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Flex container with responsive `direction`, `gap`, `align`, and `justify`,
 * plus `wrap`, `full`-width, and `flex`-fill modifiers. Use Flex for rows and
 * Stack for columns; cross-axis `align` defaults from `direction` when unset.
 * It renders a `<div>`, or a `<span>` with `as="span"`.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 * `gap` is explicit; omitted, it stays unset.
 *
 * @see {@link Stack} for the column-direction shorthand.
 */
export function Flex({
	as: Element = 'div',
	direction = 'row',
	gap,
	align,
	justify,
	wrap,
	flex,
	full,
	className,
	children,
	...props
}: FlexProps) {
	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return (
		<Element
			data-slot="flex"
			className={cn(
				resolveDirection(direction),
				resolveAlign(resolvedAlign),
				resolveGap(gap),
				resolveJustify(justify),
				'flex',
				wrap && 'flex-wrap',
				full && 'w-full',
				flex === '1' && 'flex-1',
				flex === 'auto' && 'flex-auto',
				className,
			)}
			{...props}
		>
			{children}
		</Element>
	)
}

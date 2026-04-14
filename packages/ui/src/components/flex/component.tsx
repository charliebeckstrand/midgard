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
	/** Flex direction. Supports responsive breakpoints, e.g. `{ initial: 'col', md: 'row' }`. Defaults to `row`. */
	direction?: ResponsiveDirection
	/** Gap between children, mapped to tailwind `gap-*`. */
	gap?: FlexGap
	/** Cross-axis alignment. Supports responsive breakpoints. Defaults to `center`. */
	align?: ResponsiveAlign
	/** Main-axis alignment. */
	justify?: FlexJustify
	/** Allow children to wrap onto multiple lines. */
	wrap?: boolean
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Optional width constraint. */
	width?: FlexWidth
	/** Apply `flex: 1 1 0%` so the element fills available space. */
	flex?: boolean
	/** Stretch all children equally so they share the available space. */
	equal?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Horizontal flex container. Defaults to `direction="row"` and `align="center"`.
 *
 * Use `<Flex>` for rows (toolbars, headers, inline groups).
 * Use `<Stack>` for columns (page content, form fields, vertical lists).
 */
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
				gap !== undefined && gapMap[gap],
				resolveAlign(align),
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

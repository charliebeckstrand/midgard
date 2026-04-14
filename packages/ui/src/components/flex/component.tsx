import type React from 'react'
import { cn } from '../../core'
import {
	alignMap,
	directionMap,
	type FlexAlign,
	type FlexDirection,
	type FlexGap,
	type FlexJustify,
	type FlexWidth,
	gapMap,
	justifyMap,
	widthMap,
} from './variants'

export type FlexProps = {
	/** Flex direction. Defaults to `row`. */
	direction?: FlexDirection
	/** Gap between children, mapped to tailwind `gap-*`. */
	gap?: FlexGap
	/** Cross-axis alignment. Defaults to `center`. */
	align?: FlexAlign
	/** Main-axis alignment. */
	justify?: FlexJustify
	/** Allow children to wrap onto multiple lines. */
	wrap?: boolean
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Optional width constraint. */
	width?: FlexWidth
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
				directionMap[direction],
				gap !== undefined && gapMap[gap],
				alignMap[align],
				justify && justifyMap[justify],
				wrap && 'flex-wrap',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

import type React from 'react'
import { cn } from '../../core'
import {
	alignMap,
	directionMap,
	gapMap,
	justifyMap,
	type StackAlign,
	type StackDirection,
	type StackGap,
	type StackJustify,
} from './variants'

export type StackProps = {
	/** Flex direction. Defaults to `column`. */
	direction?: StackDirection
	/** Gap between children, mapped to tailwind `gap-*`. Defaults to `4`. */
	gap?: StackGap
	/** Cross-axis alignment. */
	align?: StackAlign
	/** Main-axis alignment. */
	justify?: StackJustify
	/** Allow children to wrap onto multiple lines. */
	wrap?: boolean
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	/** Optional width, useful when `inline` is true. */
	width?: 'full' | 'min' | 'max' | 'fit'
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Stack({
	direction = 'column',
	gap = 4,
	align,
	justify,
	wrap,
	inline,
	width,
	className,
	children,
	...props
}: StackProps) {
	return (
		<div
			data-slot="stack"
			className={cn(
				inline ? 'inline-flex' : 'flex',
				width === 'full' && 'w-full',
				width === 'min' && 'w-min',
				width === 'max' && 'w-max',
				width === 'fit' && 'w-fit',
				directionMap[direction],
				gapMap[gap],
				align && alignMap[align],
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

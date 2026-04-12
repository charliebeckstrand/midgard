import type React from 'react'
import { cn } from '../../core'
import { type AreaBorder, type AreaPadding, borderMap, paddingMap } from './variants'

export type AreaProps = {
	/** Padding token. Omit for no padding. */
	padding?: AreaPadding
	/** Border style. Defaults to `dashed`. */
	border?: AreaBorder
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * A neutral, rounded outline used in demos and docs to visualize the bounds
 * of a layout primitive. Defaults to a dashed border with no padding.
 */
export function Area({ padding, border = 'dashed', className, children, ...props }: AreaProps) {
	return (
		<div
			data-slot="area"
			className={cn('rounded-lg', borderMap[border], padding && paddingMap[padding], className)}
			{...props}
		>
			{children}
		</div>
	)
}

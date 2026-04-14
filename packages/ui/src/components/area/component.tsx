import type React from 'react'
import { cn } from '../../core'
import { type AreaBorder, type AreaPadding, borderMap, paddingMap, radius } from './variants'

export type AreaProps = {
	/** Padding token. Omit for no padding. */
	padding?: AreaPadding
	/** Border style. Defaults to `dashed`. */
	border?: AreaBorder
	grow?: boolean
	center?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * A neutral, rounded outline used in demos and docs to visualize the bounds
 * of a layout primitive. Defaults to a dashed border with no padding.
 */
export function Area({
	padding = 'md',
	border = 'dashed',
	grow = true,
	center = false,
	className,
	children,
	...props
}: AreaProps) {
	return (
		<div
			data-slot="area"
			className={cn(
				'flex',
				radius,
				grow && 'flex-1 h-full',
				center && 'items-center justify-center',
				paddingMap[padding],
				borderMap[border],
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

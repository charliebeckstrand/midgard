import type React from 'react'
import { cn } from '../../core'
import { type ContainerPadding, type ContainerSize, paddingMap, sizeMap } from './variants'

export type ContainerProps = {
	/** Max-width constraint. Defaults to `xl`. */
	size?: ContainerSize
	/** Responsive horizontal padding. Defaults to `md`. Pass `none` to disable. */
	padding?: ContainerPadding
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Container({
	size = 'xl',
	padding = 'md',
	className,
	children,
	...props
}: ContainerProps) {
	return (
		<div
			data-slot="container"
			className={cn('mx-auto w-full', sizeMap[size], paddingMap[padding], className)}
			{...props}
		>
			{children}
		</div>
	)
}

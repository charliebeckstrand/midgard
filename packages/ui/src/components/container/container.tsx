import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/container'

export type ContainerSize = keyof typeof k.size
export type ContainerPadding = keyof typeof k.padding

export type ContainerProps = {
	/** Max-width constraint. Defaults to `md`. */
	size?: ContainerSize
	/** Responsive horizontal padding. Defaults to `md`. Pass `none` to disable. */
	padding?: ContainerPadding
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Centered max-width page wrapper with responsive horizontal `padding`. */
export function Container({
	size = 'md',
	padding = 'md',
	className,
	children,
	...props
}: ContainerProps) {
	return (
		<div
			data-slot="container"
			className={cn('mx-auto w-full h-full', k.size[size], k.padding[padding], className)}
			{...props}
		>
			{children}
		</div>
	)
}

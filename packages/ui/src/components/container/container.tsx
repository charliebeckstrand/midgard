import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/container'

/** Max-width token for {@link Container}. */
export type ContainerSize = keyof typeof k.size
/** Horizontal-padding token for {@link Container}; includes `'none'`. */
export type ContainerPadding = keyof typeof k.padding

/** Props for {@link Container}: max-width `size` and horizontal `padding` tokens atop native `<div>` attributes. */
export type ContainerProps = {
	/**
	 * Max-width constraint.
	 *
	 * @defaultValue 'md'
	 */
	size?: ContainerSize
	/**
	 * Responsive horizontal padding. Pass `'none'` to disable.
	 *
	 * @defaultValue 'md'
	 */
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

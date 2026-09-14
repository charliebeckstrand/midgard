import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/container'

/** Max-width token for {@link Container}. */
export type ContainerSize = keyof typeof k.size
/** Horizontal-padding token for {@link Container}; includes `'none'`. */
export type ContainerPadding = keyof typeof k.padding

/** Props for {@link Container}: max-width `size` and horizontal `padding` tokens atop native `<div>` attributes. */
export type ContainerProps = {
	/**
	 * Max-width constraint. Applies only from `lg` up; below that the container
	 * is full-bleed.
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
} & Omit<ComponentProps<'div'>, 'className'>

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
			className={cn('w-full h-full mx-auto', k.padding[padding], k.size[size], className)}
			{...props}
		>
			{children}
		</div>
	)
}

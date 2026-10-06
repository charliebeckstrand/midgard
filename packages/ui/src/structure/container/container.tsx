import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/container'

/** Max-width token for {@link Container}. */
export type ContainerSize = keyof typeof k.size
/** Horizontal-padding token for {@link Container}. The token `0` removes the padding. */
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
	 * Horizontal padding. Applies at every width. The prop takes one token, not
	 * a breakpoint object. Pass `0` to remove the padding.
	 *
	 * @defaultValue 'md'
	 */
	padding?: ContainerPadding
	className?: string
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Centered page wrapper that fills the height of its parent. It has a maximum
 * width from `lg` up and horizontal `padding` at every width.
 */
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

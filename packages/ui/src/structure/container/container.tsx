import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { VariantProps } from '../../core/recipe'
import { k } from '../../recipes/kata/container'

/** Max-width token for {@link Container}. */
export type ContainerSize = NonNullable<VariantProps<typeof k>['width']>
/** Horizontal-padding token for {@link Container}. The token `0` removes the padding. */
export type ContainerPadding = NonNullable<VariantProps<typeof k>['padding']>

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
} & ComponentProps<'div'>

/**
 * Centered page wrapper that fills the height of its parent. It has a maximum
 * width from `lg` up and horizontal `padding` at every width.
 */
export function Container({ size, padding, className, children, ...props }: ContainerProps) {
	return (
		<div
			data-slot="container"
			className={cn(k({ width: size, padding }).base, className)}
			{...props}
		>
			{children}
		</div>
	)
}

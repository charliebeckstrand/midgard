import type { ComponentPropsWithoutRef, CSSProperties } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/container'

/** Max-width token for {@link Container}. */
export type ContainerSize = Exclude<keyof typeof k.size, 'custom'>
/** Horizontal-padding token for {@link Container}; includes `'none'`. */
export type ContainerPadding = keyof typeof k.padding

/** Props for {@link Container}: max-width `size` and horizontal `padding` tokens atop native `<div>` attributes. */
export type ContainerProps = {
	/**
	 * Max-width constraint: a named token, or a number for an exact pixel cap
	 * (e.g. `1920`). Both apply only from `lg` up; below that the container is
	 * full-bleed.
	 *
	 * @defaultValue 'md'
	 */
	size?: ContainerSize | number
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
	style,
	children,
	...props
}: ContainerProps) {
	// A numeric `size` is an exact pixel cap; carry it as an inline custom
	// property so the value escapes Tailwind's build-time class scan, then gate
	// it to `lg` up via the recipe to match the token sizes' full-bleed-below-lg
	// behavior.
	const numeric = typeof size === 'number'
	const sizeStyle = numeric
		? ({ '--container-size': `${size}px`, ...style } as CSSProperties)
		: style

	return (
		<div
			data-slot="container"
			className={cn(
				'mx-auto w-full h-full',
				numeric ? k.size.custom : k.size[size],
				k.padding[padding],
				className,
			)}
			style={sizeStyle}
			{...props}
		>
			{children}
		</div>
	)
}

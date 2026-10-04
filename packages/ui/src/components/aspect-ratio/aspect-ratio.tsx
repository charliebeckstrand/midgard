import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/aspect-ratio'

/**
 * An aspect-ratio preset: a ratio (`1/1`, `3/2`, `4/3`, `16/9`, `21/9`) or
 * `auto`. `square` and `video` are aliases of `1/1` and `16/9`.
 */
export type AspectRatioPreset = keyof typeof k.ratio

/** Props for {@link AspectRatio}; extends `<div>` attributes with `ratio`. */
export type AspectRatioProps = {
	/** Preset or numeric ratio. @defaultValue '1/1' */
	ratio?: AspectRatioPreset | number
	className?: string
	children?: ReactNode
} & Omit<ComponentProps<'div'>, 'className' | 'children'>

/**
 * Box constraining its content to a fixed aspect ratio with overflow clipped.
 * A named preset resolves to a recipe class; a numeric `ratio` is applied as an
 * inline `aspect-ratio` style. Static leaf: renders in React Server Components.
 */
export function AspectRatio({
	ratio = '1/1',
	className,
	style,
	children,
	...props
}: AspectRatioProps) {
	const isPreset = typeof ratio === 'string'

	return (
		<div
			data-slot="aspect-ratio"
			className={cn('overflow-hidden', isPreset && k.ratio[ratio], className)}
			// The consumer style spreads first, and the ratio wins (CONVENTIONS.md §3.9).
			style={isPreset ? style : { ...style, aspectRatio: ratio }}
			{...props}
		>
			{children}
		</div>
	)
}

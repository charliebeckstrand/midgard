import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/aspect-ratio'

/**
 * An aspect-ratio preset: a ratio (`1/1`, `4/3`, `3/2`, `16/9`, `21/9`) or
 * `auto`. `square` and `video` are aliases of `1/1` and `16/9`.
 */
export type AspectRatioPreset = keyof typeof k.ratio

/** Props for {@link AspectRatio}; extends `<div>` attributes with `ratio`. */
export type AspectRatioProps = {
	/**
	 * Preset or numeric ratio. A number that is not finite or not more than zero
	 * gives the default. @defaultValue '1/1'
	 */
	ratio?: AspectRatioPreset | number
	className?: string
	children?: ReactNode
} & Omit<ComponentProps<'div'>, 'className' | 'children'>

/**
 * Box constraining its content to a fixed aspect ratio with overflow clipped.
 * A named preset resolves to a recipe class; a numeric `ratio` is applied as an
 * inline `aspect-ratio` style. A number that is not finite or not more than zero
 * gives the `1/1` preset. On each path, the ratio wins over an `aspectRatio` in
 * `style`. Static leaf: renders in React Server Components.
 */
export function AspectRatio({
	ratio = '1/1',
	className,
	style,
	children,
	...props
}: AspectRatioProps) {
	// A number that the browser drops, or that collapses the box, gives the default.
	const value = typeof ratio === 'number' && !(Number.isFinite(ratio) && ratio > 0) ? '1/1' : ratio

	const isPreset = typeof value === 'string'

	return (
		<div
			data-slot="aspect-ratio"
			className={cn('overflow-hidden', isPreset && k.ratio[value], className)}
			// The consumer style spreads first, and the ratio wins (CONVENTIONS.md §3.9). A preset
			// removes the inline ratio, so that the class sets the ratio.
			style={{ ...style, aspectRatio: isPreset ? undefined : value }}
			{...props}
		>
			{children}
		</div>
	)
}

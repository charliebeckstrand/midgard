import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/aspect-ratio'

/** Named aspect-ratio preset (e.g. `square`, `video`); the keys of the recipe's ratio map. */
export type AspectRatioPreset = keyof typeof k.ratio

/** Props for {@link AspectRatio}; extends `<div>` attributes with `ratio`. */
export type AspectRatioProps = {
	/** Preset name or numeric ratio. @defaultValue 'square' */
	ratio?: AspectRatioPreset | number
	className?: string
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

/**
 * Box constraining its content to a fixed aspect ratio with overflow clipped.
 * A named preset resolves to a recipe class; a numeric `ratio` is applied as an
 * inline `aspect-ratio` style. Static leaf: renders in React Server Components.
 */
export function AspectRatio({
	ratio = 'square',
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
			style={isPreset ? style : { aspectRatio: ratio, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

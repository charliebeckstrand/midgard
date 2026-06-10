import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/aspect-ratio'

export type AspectRatioPreset = keyof typeof k.ratio

export type AspectRatioProps = {
	/** Preset name or numeric ratio. Defaults to square. */
	ratio?: AspectRatioPreset | number
	className?: string
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

/** Box constraining its content to a fixed aspect ratio. `ratio` accepts a named preset or a raw numeric ratio; overflow is clipped. */
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

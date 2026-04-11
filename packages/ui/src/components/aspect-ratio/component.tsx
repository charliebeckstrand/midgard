import type React from 'react'
import { cn } from '../../core'
import { type AspectRatioPreset, ratioMap } from './variants'

export type AspectRatioProps = {
	/**
	 * Aspect ratio. Accepts a preset (`square`, `video`, `16/9`, `4/3`, `3/2`,
	 * `21/9`) or a numeric ratio (e.g. `1.618` for golden). Defaults to `square`.
	 */
	ratio?: AspectRatioPreset | number
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

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
			className={cn('overflow-hidden', isPreset && ratioMap[ratio], className)}
			style={isPreset ? style : { aspectRatio: ratio, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

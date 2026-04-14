import type React from 'react'
import { cn } from '../../core'
import { type AspectRatioPreset, ratioMap } from './variants'

export type AspectRatioProps = {
	/** Preset name or numeric ratio. Defaults to square. */
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

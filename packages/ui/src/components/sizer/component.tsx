import type React from 'react'
import { cn } from '../../core'
import { gapMap, type SizerGap, type SizerSize, sizeMap } from './variants'

export type SizerProps = {
	/** Max-width constraint. Defaults to `sm`. */
	size?: SizerSize
	/** Flex-column gap in Tailwind spacing units. Defaults to `4`. */
	gap?: SizerGap
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Sizer({ size = 'sm', gap = 4, className, children, ...props }: SizerProps) {
	return (
		<div
			data-slot="sizer"
			className={cn('flex flex-col', gapMap[gap], size !== false && sizeMap[size], className)}
			{...props}
		>
			{children}
		</div>
	)
}

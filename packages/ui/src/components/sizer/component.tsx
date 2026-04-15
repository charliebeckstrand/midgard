import type React from 'react'
import { cn } from '../../core'
import { directionMap, type FlexDirection } from '../flex'
import { gapMap, type SizerGap, type SizerSize, sizeMap } from './variants'

export type SizerProps = {
	/** Max-width constraint. Defaults to `sm`. */
	size?: SizerSize
	/** Flex direction. Defaults to `col`. */
	direction?: FlexDirection
	/** Flex-column gap in Tailwind spacing units. Defaults to `4`. */
	gap?: SizerGap
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Sizer({
	size = 'md',
	gap = 4,
	direction = 'col',
	className,
	children,
	...props
}: SizerProps) {
	return (
		<div
			data-slot="sizer"
			className={cn('flex', directionMap[direction], gapMap[gap], sizeMap[size], className)}
			{...props}
		>
			{children}
		</div>
	)
}

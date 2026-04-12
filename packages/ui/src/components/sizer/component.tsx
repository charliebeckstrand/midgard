import type React from 'react'
import { cn } from '../../core'
import { type SizerSize, sizeMap } from './variants'

export type SizerProps = {
	/** Max-width constraint. Defaults to `md`. */
	size?: SizerSize
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Sizer({ size = 'md', className, children, ...props }: SizerProps) {
	return (
		<div data-slot="sizer" className={cn(sizeMap[size], className)} {...props}>
			{children}
		</div>
	)
}

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { type StatusDotVariants, statusDotVariants } from '../../recipes/kata/status'

export type StatusDotProps = StatusDotVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

export function StatusDot({ variant, status, size, pulse, className, ...props }: StatusDotProps) {
	const inherited = useDensity()
	const resolvedSize = size ?? inherited.size

	return (
		<span
			data-slot="status-dot"
			className={cn(statusDotVariants({ variant, status, size: resolvedSize, pulse }), className)}
			{...props}
		/>
	)
}

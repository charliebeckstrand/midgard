import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/concentric'
import { type StatusDotVariants, statusDotVariants } from '../../recipes/kata/status'

export type StatusDotProps = StatusDotVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

export function StatusDot({ variant, status, size, pulse, className, ...props }: StatusDotProps) {
	const resolvedSize = useResolvedSize(size)

	return (
		<span
			data-slot="status-dot"
			className={cn(statusDotVariants({ variant, status, size: resolvedSize, pulse }), className)}
			{...props}
		/>
	)
}

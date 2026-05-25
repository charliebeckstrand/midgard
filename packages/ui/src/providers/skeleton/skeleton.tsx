import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { SkeletonContext } from './context'

type SkeletonProps = {
	/** When provided, crossfades from skeleton to real content as ready flips. */
	ready?: boolean
	className?: string
	children: ReactNode
}

/**
 * Renders descendants as skeletons shaped by their own layout. When `ready`
 * is provided, crossfades to the real content as it flips true.
 */
export function Skeleton({ ready, className, children }: SkeletonProps) {
	if (ready === undefined) {
		return (
			<SkeletonContext value={true}>
				<span data-slot="skeleton" aria-busy="true" className={cn('contents', className)}>
					{children}
				</span>
			</SkeletonContext>
		)
	}

	return (
		<ReadyReveal
			ready={ready}
			className={className}
			placeholder={<SkeletonContext value={true}>{children}</SkeletonContext>}
		>
			<SkeletonContext value={false}>{children}</SkeletonContext>
		</ReadyReveal>
	)
}

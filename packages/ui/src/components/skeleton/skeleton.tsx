import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { SkeletonProvider } from './context'

export type SkeletonProps = {
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
			<SkeletonProvider value={true}>
				<span data-slot="skeleton" aria-busy="true" className={cn('contents', className)}>
					{children}
				</span>
			</SkeletonProvider>
		)
	}

	return (
		<ReadyReveal
			ready={ready}
			className={className}
			placeholder={<SkeletonProvider value={true}>{children}</SkeletonProvider>}
		>
			<SkeletonProvider value={false}>{children}</SkeletonProvider>
		</ReadyReveal>
	)
}

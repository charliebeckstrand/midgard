import type React from 'react'
import { cn } from '../../core'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { SkeletonProvider } from './context'

export type SkeletonProps = {
	/** When provided, crossfades from skeleton to real content as ready flips. */
	ready?: boolean
	/** Animation mode forwarded to ReadyReveal. */
	mode?: 'crossfade' | 'wait'
	className?: string
	children: React.ReactNode
}

/**
 * Renders children as dynamically-shaped skeletons via context.
 * Supply `ready` to crossfade into real content.
 */
export function Skeleton({ ready, mode = 'crossfade', className, children }: SkeletonProps) {
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
			mode={mode}
			className={className}
			placeholder={<SkeletonProvider value={true}>{children}</SkeletonProvider>}
		>
			<SkeletonProvider value={false}>{children}</SkeletonProvider>
		</ReadyReveal>
	)
}

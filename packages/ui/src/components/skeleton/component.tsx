'use client'

import type React from 'react'
import { cn } from '../../core'
import { ContentReveal } from '../../primitives/content-reveal'
import { SkeletonProvider } from './context'

export type SkeletonProps = {
	/**
	 * When omitted, the subtree always renders as a skeleton.
	 * When provided, Skeleton crossfades between the placeholder (skeleton
	 * mode) and the real content as `ready` flips.
	 */
	ready?: boolean
	/** Animation mode, forwarded to `ContentReveal` when `ready` is provided. */
	mode?: 'crossfade' | 'wait'
	className?: string
	children: React.ReactNode
}

/**
 * Renders its children as dynamically-shaped skeletons by flipping on a
 * context each skeleton-aware component reads. Supply `ready` to also
 * handle the transition from skeleton to real content.
 *
 *     <Skeleton>
 *       <Button size="lg">Submit</Button>
 *       <Avatar size="md" />
 *     </Skeleton>
 *
 *     <Skeleton ready={!loading}>
 *       <UserCard user={user} />
 *     </Skeleton>
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
		<ContentReveal
			ready={ready}
			mode={mode}
			className={className}
			placeholder={<SkeletonProvider value={true}>{children}</SkeletonProvider>}
		>
			<SkeletonProvider value={false}>{children}</SkeletonProvider>
		</ContentReveal>
	)
}

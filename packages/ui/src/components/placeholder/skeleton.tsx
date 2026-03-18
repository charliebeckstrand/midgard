'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'

const pulse = {
	initial: { opacity: 0.5 },
	animate: { opacity: 1 },
	transition: {
		duration: 1,
		repeat: Number.POSITIVE_INFINITY,
		repeatType: 'reverse' as const,
		ease: 'easeInOut' as const,
	},
}

const fill = 'bg-zinc-200 dark:bg-zinc-800'

export type SkeletonProps = {
	className?: string
	children?: React.ReactNode
}

/**
 * Dynamic skeleton placeholder.
 *
 * Wrap mode — pass children to match their exact dimensions:
 *   <Skeleton><Button>Submit</Button></Skeleton>
 *
 * Bare mode — size via className:
 *   <Skeleton className="h-10 w-full rounded-lg" />
 */
export function Skeleton({ children, className }: SkeletonProps) {
	if (!children) {
		return (
			<motion.div
				role="status"
				aria-label="Loading"
				className={cn('rounded-lg', fill, className)}
				{...pulse}
			/>
		)
	}

	return (
		<motion.div role="status" aria-label="Loading" className={cn('relative', className)} {...pulse}>
			<div className="pointer-events-none invisible" aria-hidden="true">
				{children}
			</div>
			<div className={cn('absolute inset-0 rounded-[inherit] rounded-lg', fill)} />
		</motion.div>
	)
}

/**
 * Factory — creates a preset skeleton component from structural classes.
 * One line per component, zero maintenance.
 *
 *   export const InputSkeleton = skeleton('block w-full rounded-lg ...')
 */
export function skeleton(baseClasses: string, displayName?: string) {
	function ComponentSkeleton({ className }: { className?: string }) {
		return <Skeleton className={cn(baseClasses, className)} />
	}

	ComponentSkeleton.displayName = displayName ?? 'Skeleton'
	return ComponentSkeleton
}

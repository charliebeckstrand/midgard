'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { kage, katachi, ma } from '../../recipes'
import { skeleton } from './skeleton'

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
const bar = `h-2 rounded-full ${fill}`

/** @deprecated Use `Skeleton` or component-specific skeletons instead */
export const Placeholder = skeleton('', 'Placeholder')

/** @deprecated Use `InputSkeleton` from `ui/input` instead */
export const PlaceholderInput = skeleton(
	`block w-full ${katachi.maru} ${kage.ring} ${ma.control}`,
	'PlaceholderInput',
)

/** @deprecated Use `TextareaSkeleton` from `ui/textarea` instead */
export const PlaceholderTextarea = skeleton(
	`block w-full ${katachi.maru} ${kage.ring} ${ma.control} min-h-[5.5rem] sm:min-h-[4.5rem]`,
	'PlaceholderTextarea',
)

/** @deprecated Use `ButtonSkeleton` from `ui/button` instead */
export const PlaceholderButton = skeleton(
	`inline-flex ${katachi.maru} border border-transparent ${ma.control}`,
	'PlaceholderButton',
)

/** Multi-line text skeleton with configurable bar count */
export function PlaceholderText({ className, bars = 3 }: { className?: string; bars?: number }) {
	const items = Array.from({ length: bars }, (_, i) => ({
		id: `bar-${i}`,
		width: i % 2 === 0 ? 'max-w-[90%]' : '',
		spacing: i < bars - 1,
	}))

	return (
		<motion.div role="status" aria-label="Loading" className={cn('w-full', className)} {...pulse}>
			{items.map((item) => (
				<div key={item.id} className={cn(bar, item.width, item.spacing && 'mb-2.5')} />
			))}
		</motion.div>
	)
}

/** Sidebar item skeleton with optional icon placeholder */
export function PlaceholderSidebarItem({
	className,
	icon = true,
}: {
	className?: string
	icon?: boolean
}) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2.5 sm:py-2', className)}
			{...pulse}
		>
			{icon && <div className={cn('size-5 shrink-0 rounded sm:size-4', fill)} />}
			<div className={cn('h-lh flex-1 rounded text-base/6 sm:text-sm/6', fill)} />
		</motion.div>
	)
}

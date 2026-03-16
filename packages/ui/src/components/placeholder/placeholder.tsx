'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'

type PlaceholderProps = {
	className?: string
}

const pulseAnimation = {
	initial: { opacity: 0.4 },
	animate: { opacity: 1 },
	transition: {
		duration: 1,
		repeat: Number.POSITIVE_INFINITY,
		repeatType: 'reverse' as const,
		ease: 'easeInOut' as const,
	},
}

const bar = 'h-2 rounded-full bg-gray-200 dark:bg-gray-700'

export function Placeholder({ className }: PlaceholderProps) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(className, 'w-full max-w-sm')}
			{...pulseAnimation}
		>
			<div className={clsx(bar, 'mb-2.5 max-w-[90%]')} />
			<div className={clsx(bar, 'mb-2.5')} />
			<div className={clsx(bar, 'max-w-[90%]')} />
		</motion.div>
	)
}

export function PlaceholderInput({ className }: PlaceholderProps) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(
				className,
				'relative block w-full rounded-lg border border-zinc-950/10 px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
				'dark:border-white/10',
			)}
			{...pulseAnimation}
		>
			<div className="h-[1em] max-w-[60%] rounded bg-gray-200 text-base/6 sm:text-sm/6 dark:bg-gray-700" />
		</motion.div>
	)
}

export function PlaceholderTextarea({ className }: PlaceholderProps) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(
				className,
				'relative block w-full rounded-lg border border-zinc-950/10 px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
				'dark:border-white/10',
			)}
			{...pulseAnimation}
		>
			<div className="mb-2 h-[1em] max-w-[80%] rounded bg-gray-200 text-base/6 sm:text-sm/6 dark:bg-gray-700" />
			<div className="mb-2 h-[1em] rounded bg-gray-200 text-base/6 sm:text-sm/6 dark:bg-gray-700" />
			<div className="h-[1em] max-w-[40%] rounded bg-gray-200 text-base/6 sm:text-sm/6 dark:bg-gray-700" />
		</motion.div>
	)
}

export function PlaceholderSidebarItem({ className }: PlaceholderProps) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(className, 'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 sm:py-2')}
			{...pulseAnimation}
		>
			<div className="size-5 shrink-0 rounded bg-gray-200 sm:size-4 dark:bg-gray-700" />
			<div className="h-2 flex-1 max-w-[70%] rounded-full bg-gray-200 dark:bg-gray-700" />
		</motion.div>
	)
}

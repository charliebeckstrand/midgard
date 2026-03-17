'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'

type PlaceholderProps = {
	className?: string
	bars?: number
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

const bar = 'h-2 rounded-full bg-zinc-200 dark:bg-zinc-700'

export function Placeholder({ className, bars = 3 }: PlaceholderProps) {
	const items = Array.from({ length: bars }, (_, i) => ({
		id: `bar-${i}`,
		width: i % 2 === 0 ? 'max-w-[90%]' : '',
		spacing: i < bars - 1,
	}))

	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(className, 'w-full')}
			{...pulseAnimation}
		>
			{items.map((item) => (
				<div key={item.id} className={clsx(bar, item.width, item.spacing && 'mb-2.5')} />
			))}
		</motion.div>
	)
}

export function PlaceholderInput({ className }: { className?: string }) {
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
			<div className="h-[1em] max-w-[60%] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
		</motion.div>
	)
}

export function PlaceholderTextarea({ className }: { className?: string }) {
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
			<div className="mb-2 h-[1em] max-w-[80%] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
			<div className="mb-2 h-[1em] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
			<div className="h-[1em] max-w-[40%] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
		</motion.div>
	)
}

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
			className={clsx(className, 'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 sm:py-2')}
			{...pulseAnimation}
		>
			{icon && <div className="size-5 shrink-0 rounded bg-zinc-200 sm:size-4 dark:bg-zinc-700" />}
			<div className="h-2 flex-1 max-w-[70%] rounded-full bg-zinc-200 dark:bg-zinc-700" />
		</motion.div>
	)
}

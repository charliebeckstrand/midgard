'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'

const pulseAnimation = {
	initial: { opacity: 0.5 },
	animate: { opacity: 1 },
	transition: {
		duration: 1,
		repeat: Number.POSITIVE_INFINITY,
		repeatType: 'reverse' as const,
		ease: 'easeInOut' as const,
	},
}

export function Placeholder({ className }: { className?: string }) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(className, 'rounded-lg bg-zinc-200 dark:bg-zinc-700')}
			{...pulseAnimation}
		/>
	)
}

const bar = 'h-2 rounded-full bg-zinc-200 dark:bg-zinc-700'

export function PlaceholderText({ className, bars = 3 }: { className?: string; bars?: number }) {
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
				'relative block w-full rounded-lg ring-1 ring-zinc-950/10 bg-zinc-200 dark:bg-zinc-800 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
				'dark:ring-white/10',
			)}
			{...pulseAnimation}
		>
			<div className="h-lh" />
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
				'relative block w-full rounded-lg ring-1 ring-zinc-950/10 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
				'dark:ring-white/10',
			)}
			{...pulseAnimation}
		>
			<div className="mb-2 h-[1em] max-w-[80%] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
			<div className="mb-2 h-[1em] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
			<div className="h-[1em] max-w-[40%] rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
		</motion.div>
	)
}

export function PlaceholderButton({ className }: { className?: string }) {
	return (
		<motion.div
			role="status"
			aria-label="Loading"
			className={clsx(
				className,
				'size-10 rounded-lg ring-1 ring-zinc-950/10 bg-zinc-200 dark:bg-zinc-800',
				'dark:ring-white/10',
			)}
			{...pulseAnimation}
		/>
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
			<div className="h-lh flex-1 rounded bg-zinc-200 text-base/6 sm:text-sm/6 dark:bg-zinc-700" />
		</motion.div>
	)
}

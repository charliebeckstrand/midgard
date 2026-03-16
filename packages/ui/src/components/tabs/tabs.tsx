'use client'

import clsx from 'clsx'
import { LayoutGroup, motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'

export function Tabs({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const groupId = useId()

	return (
		<LayoutGroup id={groupId}>
			<div
				{...props}
				className={clsx(className, 'flex gap-4 border-b border-zinc-950/10 dark:border-white/10')}
			/>
		</LayoutGroup>
	)
}

export function Tab({
	current,
	className,
	children,
	prepend,
	append,
	...props
}: {
	current?: boolean
	prepend?: React.ReactNode
	append?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'> & { className?: string }) {
	return (
		<span className={clsx(className, 'relative flex')}>
			{current && (
				<motion.span
					layoutId="current-indicator"
					className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-zinc-950 dark:bg-white"
				/>
			)}
			<button
				{...props}
				type="button"
				className={clsx(
					'flex items-center gap-2 px-2 pb-3 pt-1 text-sm/6 font-medium',
					current
						? 'text-zinc-950 dark:text-white'
						: 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
				)}
			>
				{prepend}
				{children}
				{append}
			</button>
		</span>
	)
}

export function TabTitle({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={clsx(className, 'truncate')} />
}

export function TabSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={clsx(
				className,
				'text-xs/5 text-zinc-500 group-data-[current]:text-zinc-700 dark:text-zinc-400 dark:group-data-[current]:text-zinc-300',
			)}
		/>
	)
}

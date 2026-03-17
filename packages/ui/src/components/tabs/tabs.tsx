'use client'

import { LayoutGroup } from 'motion/react'
import type React from 'react'
import { useId, useRef } from 'react'
import { cn } from '../../core'
import { useMenuKeyboard } from '../../hooks'
import { ActiveIndicator } from '../../primitives'

export function Tabs({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const groupId = useId()
	const ref = useRef<HTMLDivElement>(null)
	const onKeyDown = useMenuKeyboard(ref, '[role="tab"]', 'horizontal')

	return (
		<LayoutGroup id={groupId}>
			<div
				ref={ref}
				role="tablist"
				onKeyDown={onKeyDown}
				{...props}
				className={cn('flex gap-4 border-b border-zinc-950/10 dark:border-white/10', className)}
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
		<span className={cn('relative flex pb-2.5', className)}>
			{current && <ActiveIndicator orientation="underline" />}
			<button
				{...props}
				type="button"
				role="tab"
				aria-selected={current}
				className={cn(
					'flex items-center gap-2 px-2 py-1 text-sm/6 font-medium focus:outline-hidden',
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
	return <span {...props} className={cn('truncate', className)} />
}

export function TabSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={cn(
				'text-xs/5 text-zinc-500 group-data-current:text-zinc-700 dark:text-zinc-400 dark:group-data-current:text-zinc-300',
				className,
			)}
		/>
	)
}

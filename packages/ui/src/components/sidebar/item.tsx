'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import type React from 'react'
import { useContext } from 'react'
import { Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { MobileSidebarContext } from '../sidebar-layout/context'
import { navItemBase } from './recipes'

export function SidebarItem({
	current,
	className,
	children,
	...props
}: { current?: boolean; className?: string; children: React.ReactNode } & (
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
	const close = useContext(MobileSidebarContext)

	const classes = clsx(
		// Base
		'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium text-zinc-950 sm:py-2 sm:text-sm/5',
		navItemBase,
		// Trailing icon (down chevron or similar)
		'*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5 sm:*:last:data-[slot=icon]:size-4',
		// Current
		'data-current:*:data-[slot=icon]:fill-zinc-950',
		// Dark current
		'dark:data-current:*:data-[slot=icon]:fill-white',
	)

	return (
		<span className={clsx(className, 'relative')}>
			{current && (
				<motion.span
					layoutId="current-indicator"
					className="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-zinc-950 dark:bg-white"
				/>
			)}
			{typeof props.href === 'string' ? (
				<Link
					{...props}
					className={classes}
					data-current={current ? 'true' : undefined}
					onClick={(e) => {
						close?.()
						;(props as React.ComponentPropsWithoutRef<typeof Link>).onClick?.(e)
					}}
				>
					<TouchTarget>{children}</TouchTarget>
				</Link>
			) : (
				<button
					{...props}
					type="button"
					className={clsx('cursor-default', classes)}
					data-current={current ? 'true' : undefined}
					onClick={(e) => {
						close?.()

						;(props as React.ComponentPropsWithoutRef<'button'>).onClick?.(e)
					}}
				>
					<TouchTarget>{children}</TouchTarget>
				</button>
			)}
		</span>
	)
}

export function SidebarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={clsx(className, 'truncate')} />
}

'use client'

import { motion } from 'motion/react'
import React from 'react'
import { cn, Link } from '../../core'
import { ActiveIndicator, TouchTarget } from '../../primitives'
import { katachi, sawari } from '../../recipes'
import { useOffcanvas } from '../layouts/context'

export function SidebarItemActions({
	className,
	...props
}: React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={cn('pointer-events-auto', className)} />
}

function splitActions(children: React.ReactNode) {
	const actions: React.ReactNode[] = []
	const rest: React.ReactNode[] = []

	React.Children.forEach(children, (child) => {
		if (React.isValidElement(child) && child.type === SidebarItemActions) {
			actions.push(child)
		} else {
			rest.push(child)
		}
	})

	return { actions, rest }
}

export function SidebarItem({
	current,
	className,
	children,
	...props
}: { current?: boolean; className?: string; children: React.ReactNode } & (
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
	const offcanvas = useOffcanvas()
	const { actions, rest } = splitActions(children)

	const classes = cn(
		// Base
		'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium select-none text-zinc-950 sm:py-2',
		sawari.nav,
		// Trailing icon (down chevron or similar)
		...katachi.iconTrailing,
		// Current
		'data-current:*:data-[slot=icon]:fill-zinc-950',
		'dark:data-current:*:data-[slot=icon]:fill-white',
		// Icon-only — auto-detected square aspect
		...katachi.iconDetect,
	)

	const Wrapper = current ? motion.span : 'span'

	return (
		<Wrapper
			className={cn('group relative', className)}
			{...(current && { whileTap: { scale: 0.97 } })}
		>
			{current && <ActiveIndicator />}
			{typeof props.href === 'string' ? (
				<Link
					{...props}
					className={cn(classes, 'relative z-10', current && 'pointer-events-none')}
					data-slot="sidebar-item"
					data-current={current ? 'true' : undefined}
					onClick={(e) => {
						offcanvas?.close()
						;(props as React.ComponentPropsWithoutRef<typeof Link>).onClick?.(e)
					}}
				>
					<TouchTarget>{rest}</TouchTarget>
				</Link>
			) : (
				<button
					{...props}
					type="button"
					className={cn('cursor-default', classes, 'relative z-10')}
					data-slot="sidebar-item"
					data-current={current ? 'true' : undefined}
					onClick={(props as React.ComponentPropsWithoutRef<'button'>).onClick}
				>
					<TouchTarget>{rest}</TouchTarget>
				</button>
			)}
			{actions}
		</Wrapper>
	)
}

export function SidebarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span data-slot="label" {...props} className={cn('truncate', className)} />
}

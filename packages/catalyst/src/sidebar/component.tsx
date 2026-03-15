'use client'

import clsx from 'clsx'
import { LayoutGroup, motion } from 'motion/react'
import type React from 'react'
import { useContext } from 'react'
import { Link } from '../link'
import { MobileSidebarContext } from '../sidebar-layout'
import { TouchTarget } from '../utils/touch-target'

function CloseIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
		</svg>
	)
}

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	return <nav {...props} className={clsx(className, 'flex h-full min-h-0 flex-col')} />
}

export function SidebarHeader({ className, children, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const close = useContext(MobileSidebarContext)

	if (close) {
		return (
			<div
				{...props}
				className={clsx(
					className,
					'flex flex-row items-center border-b border-zinc-950/5 p-4 dark:border-white/5',
				)}
			>
				<div className="flex flex-1 flex-col [&>[data-slot=section]+[data-slot=section]]:mt-2.5">
					{children}
				</div>
				<button
					type="button"
					onClick={close}
					aria-label="Close navigation"
					className="rounded-lg fill-current p-2.5 text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:fill-current"
				>
					<CloseIcon />
				</button>
			</div>
		)
	}

	return (
		<div
			{...props}
			className={clsx(
				className,
				'flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5',
			)}
		>
			{children}
		</div>
	)
}

export function SidebarBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-6',
			)}
		/>
	)
}

export function SidebarFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'flex flex-col border-t border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5',
			)}
		/>
	)
}

export function SidebarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<LayoutGroup>
			<div {...props} data-slot="section" className={clsx(className, 'flex flex-col gap-0.5')} />
		</LayoutGroup>
	)
}

export function SidebarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return (
		<hr
			{...props}
			className={clsx(className, 'my-4 border-t border-zinc-950/5 lg:-mx-4 dark:border-white/5')}
		/>
	)
}

export function SidebarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={clsx(className, 'mt-8 flex-1')} />
}

export function SidebarHeading({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
	return (
		<h3
			{...props}
			className={clsx(
				className,
				'mb-1 px-2 text-xs/6 font-medium text-zinc-500 dark:text-zinc-400',
			)}
		/>
	)
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
	const close = useContext(MobileSidebarContext)

	const classes = clsx(
		// Base
		'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium text-zinc-950 sm:py-2 sm:text-sm/5',
		// Leading icon/icon-only
		'*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5',
		// Trailing icon (down chevron or similar)
		'*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5 sm:*:last:data-[slot=icon]:size-4',
		// Avatar
		'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
		// Hover
		'hover:bg-zinc-950/5 hover:*:data-[slot=icon]:fill-zinc-950',
		// Active
		'active:bg-zinc-950/5 active:*:data-[slot=icon]:fill-zinc-950',
		// Current
		'data-current:*:data-[slot=icon]:fill-zinc-950',
		// Dark mode
		'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
		'dark:hover:bg-white/5 dark:hover:*:data-[slot=icon]:fill-white',
		'dark:active:bg-white/5 dark:active:*:data-[slot=icon]:fill-white',
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

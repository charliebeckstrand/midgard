'use client'

import clsx from 'clsx'
import { LayoutGroup } from 'motion/react'
import type React from 'react'

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	return <nav {...props} className={clsx(className, 'flex h-full min-h-0 flex-col')} />
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

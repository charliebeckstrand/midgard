'use client'

import clsx from 'clsx'
import { LayoutGroup } from 'motion/react'
import type React from 'react'
import { useId, useRef } from 'react'
import { useMenuKeyboard } from '../../hooks'

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	const groupId = useId()
	const ref = useRef<HTMLElement>(null)
	const onKeyDown = useMenuKeyboard(ref, '[data-slot="sidebar-item"]')

	return (
		<LayoutGroup id={groupId}>
			<nav
				ref={ref}
				onKeyDown={onKeyDown}
				{...props}
				className={clsx(className, 'flex h-full min-h-0 flex-col')}
			/>
		</LayoutGroup>
	)
}

export function SidebarBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'flex flex-1 flex-col overflow-hidden p-4 [&>[data-slot=section]+[data-slot=section]]:mt-4',
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

export function SidebarSection({
	className,
	scrollable,
	...props
}: React.ComponentPropsWithoutRef<'div'> & { scrollable?: boolean }) {
	return (
		<div
			{...props}
			data-slot="section"
			className={clsx(
				className,
				'flex flex-col gap-1',
				scrollable && '-my-2 -mr-2 -ml-4 py-2 pr-2 pl-4 overflow-y-auto',
			)}
		/>
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

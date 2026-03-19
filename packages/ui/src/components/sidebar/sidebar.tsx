'use client'

import { LayoutGroup } from 'motion/react'
import type React from 'react'
import { useId, useRef } from 'react'
import { cn } from '../../core'
import { useMenuKeyboard } from '../../hooks'
import { kage, sumi } from '../../recipes'

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	const groupId = useId()
	const ref = useRef<HTMLElement>(null)

	const onKeyDown = useMenuKeyboard(ref, '[data-slot="sidebar-item"]')

	return (
		<LayoutGroup id={groupId}>
			<nav
				ref={ref}
				data-slot="sidebar"
				onKeyDown={onKeyDown}
				{...props}
				className={cn('flex h-full min-h-0 flex-col', className)}
			/>
		</LayoutGroup>
	)
}

export function SidebarHeading({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
	return <h3 {...props} className={cn(`mb-1 px-2 text-xs/6 font-medium ${sumi.usui}`, className)} />
}

export function SidebarBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={cn(
				'flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-4',
				className,
			)}
		/>
	)
}

export function SidebarFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={cn(
				`flex flex-col border-t ${kage.usui} p-4 [&>[data-slot=section]+[data-slot=section]]:mt-2.5`,
				className,
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
			className={cn(
				'flex flex-col gap-1',
				scrollable && '-my-2 -mr-2 -ml-4 py-2 pr-2 pl-4 overflow-y-auto',
				className,
			)}
		/>
	)
}

export function SidebarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return <hr {...props} className={cn(`my-4 border-t ${kage.usui} lg:-mx-4`, className)} />
}

export function SidebarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={cn('mt-8 flex-1', className)} />
}

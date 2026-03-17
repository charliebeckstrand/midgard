'use client'

import { LayoutGroup } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { twMerge } from 'tailwind-merge'

export function Navbar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	return <nav {...props} className={twMerge('flex items-center gap-4 p-6', className)} />
}

export function NavbarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			aria-hidden="true"
			{...props}
			className={twMerge('h-6 w-px bg-zinc-950/10 dark:bg-white/10', className)}
		/>
	)
}

export function NavbarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const groupId = useId()

	return (
		<LayoutGroup id={groupId}>
			<div {...props} className={twMerge('flex items-center gap-3', className)} />
		</LayoutGroup>
	)
}

export function NavbarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={twMerge('-ml-4 flex-1', className)} />
}

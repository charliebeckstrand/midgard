'use client'

import clsx from 'clsx'
import { LayoutGroup } from 'motion/react'
import type React from 'react'

export function Navbar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	return (
		<nav {...props} className={clsx(className, 'flex flex-1 items-center gap-4 px-4 py-2.5')} />
	)
}

export function NavbarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			aria-hidden="true"
			{...props}
			className={clsx(className, 'h-6 w-px bg-zinc-950/10 dark:bg-white/10')}
		/>
	)
}

export function NavbarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<LayoutGroup>
			<div {...props} className={clsx(className, 'flex items-center gap-3')} />
		</LayoutGroup>
	)
}

export function NavbarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={clsx(className, '-ml-4 flex-1')} />
}

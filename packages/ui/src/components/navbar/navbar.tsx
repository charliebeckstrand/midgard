'use client'

import type React from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'

export function Navbar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
	return (
		<ActiveIndicatorScope>
			<nav {...props} className={cn('flex items-center gap-4 p-6', className)} />
		</ActiveIndicatorScope>
	)
}

export function NavbarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			aria-hidden="true"
			{...props}
			className={cn('h-6 w-px bg-zinc-950/10', 'dark:bg-white/10', className)}
		/>
	)
}

export function NavbarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<ActiveIndicatorScope>
			<div {...props} className={cn('flex items-center gap-3', className)} />
		</ActiveIndicatorScope>
	)
}

export function NavbarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div aria-hidden="true" {...props} className={cn('-ml-4 flex-1', className)} />
}

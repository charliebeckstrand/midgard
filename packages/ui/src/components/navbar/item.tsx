'use client'

import type React from 'react'
import { cn, Link } from '../../core'
import { ActiveIndicator, TouchTarget } from '../../primitives'
import { katachi, sawari } from '../../recipes'

export function NavbarItem({
	current,
	className,
	children,
	...props
}: { current?: boolean; className?: string; children: React.ReactNode } & (
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
	const classes = cn(
		// Layout
		'relative flex min-w-0 items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-950',
		sawari.nav,
		// Trailing icon — navbar-specific: skips when icon is 2nd child (no label between icons)
		'*:not-nth-2:last:data-[slot=icon]:ml-auto *:not-nth-2:last:data-[slot=icon]:size-5',
		// Avatar (navbar-specific override)
		'*:data-[slot=avatar]:[--avatar-radius:var(--radius-md)]',
		// Icon-only — auto-detected square aspect
		...katachi.iconDetect,
	)

	return (
		<span className="group relative">
			{current && <ActiveIndicator />}
			{typeof props.href === 'string' ? (
				<Link
					{...props}
					className={cn(classes, 'relative z-10', className)}
					data-current={current ? 'true' : undefined}
				>
					<TouchTarget>{children}</TouchTarget>
				</Link>
			) : (
				<button
					{...props}
					type="button"
					className={cn('cursor-default', classes, 'relative z-10', className)}
					data-current={current ? 'true' : undefined}
				>
					<TouchTarget>{children}</TouchTarget>
				</button>
			)}
		</span>
	)
}

export function NavbarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span data-slot="label" {...props} className={cn('truncate', className)} />
}

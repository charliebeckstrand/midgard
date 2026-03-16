'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import type React from 'react'
import { Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { navItemBase } from './recipes'

export function NavbarItem({
	current,
	className,
	children,
	...props
}: { current?: boolean; className?: string; children: React.ReactNode } & (
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
	const classes = clsx(
		// Base
		'relative flex min-w-0 items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-950',
		navItemBase,
		// Trailing icon (down chevron or similar)
		'*:not-nth-2:last:data-[slot=icon]:ml-auto *:not-nth-2:last:data-[slot=icon]:size-5 sm:*:not-nth-2:last:data-[slot=icon]:size-4',
		// Avatar (navbar-specific override)
		'*:data-[slot=avatar]:[--avatar-radius:var(--radius-md)]',
	)

	return (
		<span className={clsx(className, 'relative')}>
			{current && (
				<motion.span
					layoutId="current-indicator"
					className="absolute inset-x-2 -bottom-2.5 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
				/>
			)}
			{typeof props.href === 'string' ? (
				<Link {...props} className={classes} data-current={current ? 'true' : undefined}>
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

export function NavbarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={clsx(className, 'truncate')} />
}

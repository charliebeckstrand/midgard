'use client'

import clsx from 'clsx'
import type React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { Link } from '../link'
import { TouchTarget } from '../utils'
import { badge } from './variants'

type BadgeProps = VariantProps<typeof badge>

export function Badge({ color, className, ...props }: BadgeProps & React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={badge({ color, className })} />
}

export function BadgeButton({
	color,
	className,
	children,
	...props
}: BadgeProps & { className?: string; children: React.ReactNode } & (
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)) {
	const classes = clsx(
		className,
		'group relative inline-flex rounded-md focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
	)

	if (typeof props.href === 'string') {
		return (
			<Link {...props} className={classes}>
				<TouchTarget>
					<Badge color={color}>{children}</Badge>
				</TouchTarget>
			</Link>
		)
	}

	return (
		<button type="button" {...props} className={classes}>
			<TouchTarget>
				<Badge color={color}>{children}</Badge>
			</TouchTarget>
		</button>
	)
}

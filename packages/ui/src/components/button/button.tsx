'use client'

import React from 'react'
import { cn } from '../../core'
import { Link } from '../../core/link-context'
import { TouchTarget } from '../../primitives/touch-target'
import type { ButtonProps } from './types'
import { button } from './variants'

function detectIconOnly(children: React.ReactNode): boolean {
	try {
		const child = React.Children.only(children)
		return (
			React.isValidElement(child) &&
			(child.props as Record<string, unknown>)?.['data-slot'] === 'icon'
		)
	} catch {
		return false
	}
}

export function Button({ variant, color, className, children, ...props }: ButtonProps) {
	const iconOnly = detectIconOnly(children)
	const classes = cn(button({ variant, color }), iconOnly && 'icon-only', className)

	if (typeof props.href === 'string') {
		return (
			<Link {...props} className={classes} data-icon-only={iconOnly ? '' : undefined}>
				<TouchTarget>{children}</TouchTarget>
			</Link>
		)
	}

	return (
		<button
			type="button"
			{...props}
			className={cn(classes, 'cursor-default')}
			data-icon-only={iconOnly ? '' : undefined}
		>
			<TouchTarget>{children}</TouchTarget>
		</button>
	)
}

'use client'

import { twMerge } from 'tailwind-merge'
import { Link } from '../../core/link-context'
import { TouchTarget } from '../../primitives/touch-target'
import type { ButtonProps } from './types'
import { button } from './variants'

export function Button({ variant, color, className, children, ...props }: ButtonProps) {
	const classes = twMerge(button({ variant, color }), className)

	if (typeof props.href === 'string') {
		return (
			<Link {...props} className={classes}>
				<TouchTarget>{children}</TouchTarget>
			</Link>
		)
	}

	return (
		<button type="button" {...props} className={twMerge(classes, 'cursor-default')}>
			<TouchTarget>{children}</TouchTarget>
		</button>
	)
}

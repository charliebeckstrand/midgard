'use client'

import clsx from 'clsx'
import type React from 'react'
import { Link } from '../link'
import { TouchTarget } from '../utils'
import type { ButtonProps } from './types'
import { button } from './variants'

export function Button({ variant, color, className, children, ...props }: ButtonProps) {
	const classes = button({ variant, color, className })

	if (typeof props.href === 'string') {
		return (
			<Link {...props} className={classes}>
				<TouchTarget>{children}</TouchTarget>
			</Link>
		)
	}

	return (
		<button type="button" {...props} className={clsx(classes, 'cursor-default')}>
			<TouchTarget>{children}</TouchTarget>
		</button>
	)
}

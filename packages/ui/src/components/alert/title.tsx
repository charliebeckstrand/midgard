'use client'

import type React from 'react'
import { cn } from '../../core'
import { ink } from '../../recipes/text'
import { useAlert } from './context'

export function AlertTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useAlert()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(
				`text-center text-base/6 font-semibold text-balance ${ink} sm:text-left sm:text-wrap`,
				className,
			)}
		/>
	)
}

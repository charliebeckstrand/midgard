'use client'

import type React from 'react'
import { cn } from '../../core'
import { useSheet } from './context'

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useSheet()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(
				'text-lg/6 font-semibold text-zinc-950 sm:text-base/6 dark:text-white',
				className,
			)}
		/>
	)
}

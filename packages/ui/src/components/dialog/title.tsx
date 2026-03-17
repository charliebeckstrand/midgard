'use client'

import type React from 'react'
import { cn } from '../../core'
import { useDialog } from './context'

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useDialog()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(
				'text-lg/6 font-semibold text-balance text-zinc-950 sm:text-base/6 dark:text-white',
				className,
			)}
		/>
	)
}

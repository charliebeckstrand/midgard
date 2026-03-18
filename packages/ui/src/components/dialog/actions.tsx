'use client'

import type React from 'react'
import { cn } from '../../core'

export function DialogActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="actions"
			{...props}
			className={cn(
				'mt-8 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto',
				className,
			)}
		/>
	)
}

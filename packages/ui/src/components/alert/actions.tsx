'use client'

import type React from 'react'
import { cn } from '../../core'

export function AlertActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="actions"
			{...props}
			className={cn(
				'mt-6 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:mt-4 sm:flex-row sm:*:w-auto',
				className,
			)}
		/>
	)
}

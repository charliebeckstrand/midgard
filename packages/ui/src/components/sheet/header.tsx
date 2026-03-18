'use client'

import type React from 'react'
import { cn } from '../../core'

export function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="header"
			{...props}
			className={cn('flex flex-col gap-1.5 px-6 pt-6', className)}
		/>
	)
}

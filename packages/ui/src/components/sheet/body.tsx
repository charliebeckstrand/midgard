'use client'

import type React from 'react'
import { cn } from '../../core'

export function SheetBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div data-slot="body" {...props} className={cn('flex-1 overflow-auto px-6 py-6', className)} />
	)
}

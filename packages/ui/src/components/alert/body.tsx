'use client'

import type React from 'react'
import { cn } from '../../core'

export function AlertBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div data-slot="body" {...props} className={cn('mt-4', className)} />
}

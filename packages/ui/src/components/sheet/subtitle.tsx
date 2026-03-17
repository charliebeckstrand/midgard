import type React from 'react'
import { cn } from '../../core'
import { muted } from '../../recipes/text'

export function SheetSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return <p data-slot="description" {...props} className={cn(`text-sm/6 ${muted}`, className)} />
}

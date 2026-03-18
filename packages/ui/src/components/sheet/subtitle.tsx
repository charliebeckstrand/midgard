import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'

export function SheetSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p data-slot="description" {...props} className={cn(`text-sm/6 ${sumi.usui}`, className)} />
	)
}

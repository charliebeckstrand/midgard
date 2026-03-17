import type React from 'react'
import { cn } from '../../core'

export function SheetSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={cn('text-sm/6 text-zinc-500 dark:text-zinc-400', className)}
		/>
	)
}

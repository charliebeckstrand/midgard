'use client'

import type React from 'react'
import { cn } from '../../core'

export function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="footer"
			{...props}
			className={cn(
				'mt-auto flex items-center justify-end gap-3 border-t border-zinc-950/10 px-6 py-4 dark:border-white/10',
				className,
			)}
		/>
	)
}

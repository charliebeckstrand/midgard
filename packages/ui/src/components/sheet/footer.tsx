'use client'

import type React from 'react'
import { cn } from '../../core'
import { kage } from '../../recipes'

export function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="footer"
			{...props}
			className={cn(
				`mt-auto flex items-center justify-end gap-3 border-t ${kage.base} px-6 py-4`,
				className,
			)}
		/>
	)
}

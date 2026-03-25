'use client'

import type React from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'

export function ComboboxOptions({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<PopoverPanel className={cn('empty:invisible', 'scroll-py-1', 'overflow-y-scroll', className)}>
			{children}
		</PopoverPanel>
	)
}

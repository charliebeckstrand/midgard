'use client'

import type React from 'react'
import { forwardRef } from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'

export const ComboboxOptions = forwardRef<
	HTMLDivElement,
	{ className?: string; children: React.ReactNode }
>(function ComboboxOptions({ className, children }, _ref) {
	return (
		<PopoverPanel className={cn('empty:invisible', 'scroll-py-1', 'overflow-y-scroll', className)}>
			{children}
		</PopoverPanel>
	)
})

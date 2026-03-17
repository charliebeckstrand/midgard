'use client'

import clsx from 'clsx'
import type React from 'react'
import { PopoverPanel } from '../../primitives'

export function ComboboxOptions({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<PopoverPanel
			className={clsx('empty:invisible', 'scroll-py-1', 'overflow-y-scroll', className)}
		>
			{children}
		</PopoverPanel>
	)
}

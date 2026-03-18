'use client'

import type React from 'react'
import { useCallback, useState } from 'react'
import { cn } from '../../core'
import { useOverlay } from '../../hooks'
import { DropdownProvider } from './context'

export function Dropdown({
	children,
	className,
	fullWidth,
}: React.PropsWithChildren<{ className?: string; fullWidth?: boolean }>) {
	const [open, setOpen] = useState(false)
	const toggle = useCallback(() => setOpen((prev) => !prev), [])
	const close = useCallback(() => setOpen(false), [])
	const containerRef = useOverlay(open, close)

	return (
		<DropdownProvider value={{ open, toggle, close, fullWidth }}>
			<div
				ref={containerRef}
				className={cn('relative', fullWidth && 'flex w-full flex-col', className)}
			>
				{children}
			</div>
		</DropdownProvider>
	)
}

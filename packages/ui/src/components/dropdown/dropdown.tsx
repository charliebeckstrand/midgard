'use client'

import type React from 'react'
import { useCallback, useState } from 'react'
import { cn } from '../../core'
import { useOverlay } from '../../hooks'
import { DropdownProvider } from './context'

export function Dropdown({ children, className }: React.PropsWithChildren<{ className?: string }>) {
	const [open, setOpen] = useState(false)
	const toggle = useCallback(() => setOpen((prev) => !prev), [])
	const close = useCallback(() => setOpen(false), [])
	const containerRef = useOverlay(open, close)

	return (
		<DropdownProvider value={{ open, toggle, close }}>
			<div ref={containerRef} className={cn('relative', className)}>
				{children}
			</div>
		</DropdownProvider>
	)
}

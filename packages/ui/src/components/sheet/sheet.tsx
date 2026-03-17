'use client'

import type React from 'react'
import { useCallback, useId, useState } from 'react'
import type { SheetSide } from './context'
import { SheetProvider } from './context'

export type SheetProps = {
	children: React.ReactNode
	side?: SheetSide
	modal?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function Sheet({
	children,
	side = 'right',
	modal = true,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: SheetProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const open = controlledOpen ?? internalOpen
	const onOpenChange = useCallback(
		(value: boolean) => {
			controlledOnOpenChange?.(value)
			if (controlledOpen === undefined) setInternalOpen(value)
		},
		[controlledOpen, controlledOnOpenChange],
	)

	const titleId = useId()
	const descriptionId = useId()

	return (
		<SheetProvider value={{ open, onOpenChange, side, modal, titleId, descriptionId }}>
			{children}
		</SheetProvider>
	)
}

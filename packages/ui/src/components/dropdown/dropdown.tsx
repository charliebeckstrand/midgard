'use client'

import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { createContext } from '../../core'

type DropdownContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: React.RefObject<HTMLButtonElement | null>
}

export const [DropdownProvider, useDropdownContext] =
	createContext<DropdownContextValue>('Dropdown')

export type DropdownProps = {
	children: React.ReactNode
}

export function Dropdown({ children }: DropdownProps) {
	const [open, setOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)

	const close = useCallback(() => {
		setOpen(false)
		triggerRef.current?.focus()
	}, [])

	return (
		<DropdownProvider value={{ open, setOpen, close, triggerRef }}>
			<div data-slot="dropdown" className="relative">
				{children}
			</div>
		</DropdownProvider>
	)
}

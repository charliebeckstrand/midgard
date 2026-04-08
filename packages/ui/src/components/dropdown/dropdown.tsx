'use client'

import {
	autoUpdate,
	flip,
	offset,
	type Placement,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'

type DropdownContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: React.RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
	getReferenceProps: () => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
}

export const [DropdownProvider, useDropdownContext] =
	createContext<DropdownContextValue>('Dropdown')

export type DropdownProps = {
	placement?: Placement
	className?: string
	children: React.ReactNode
}

export function Dropdown({ placement = 'bottom-start', className, children }: DropdownProps) {
	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(4),
			flip(),
			shift({ padding: 8 }),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${rects.reference.width}px`,
					})
				},
			}),
		],
	})

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'menu' })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	const close = useCallback(() => {
		setOpen(false)

		triggerRef.current?.focus()
	}, [])

	return (
		<DropdownProvider
			value={{
				open,
				setOpen,
				close,
				triggerRef,
				setReference: refs.setReference,
				setFloating: refs.setFloating,
				floatingStyles,
				getReferenceProps,
				getFloatingProps,
			}}
		>
			<div data-slot="dropdown" className={cn(className)}>
				{children}
			</div>
		</DropdownProvider>
	)
}

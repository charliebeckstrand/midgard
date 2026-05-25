'use client'

import type { CSSProperties, RefObject } from 'react'
import { createContext } from '../../core'

type PopoverContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	onExitComplete?: () => void
}

export const [PopoverContext, usePopoverContext] = createContext<PopoverContextValue>('Popover')

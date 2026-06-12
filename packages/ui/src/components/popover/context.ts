'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import type { CSSProperties, RefObject } from 'react'
import { createContext } from '../../core'

type PopoverContextValue = {
	open: boolean
	/** Id of the popover panel; the trigger's `aria-controls` points at it. */
	panelId: string
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	/** Floating-ui root context; `PopoverContent`'s `modal` trap mounts on it. */
	floatingContext: FloatingRootContext
	onExitComplete?: () => void
}

export const [PopoverContext, usePopoverContext] = createContext<PopoverContextValue>('Popover')

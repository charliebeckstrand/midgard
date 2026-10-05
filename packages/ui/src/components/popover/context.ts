'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import type { CSSProperties, RefObject } from 'react'
import { createContext } from '../../core'

type PopoverContextValue = {
	open: boolean
	/** Id of the popover panel; the trigger's `aria-controls` points at it. */
	panelId: string
	/**
	 * Whether the panel is a dialog, so the trigger sets `aria-haspopup="dialog"`.
	 * It is true until a panel with no accessible name reports that it is not one.
	 */
	dialog: boolean
	/** Reports the role of the panel. {@link PopoverContent} calls it. */
	setDialog: (dialog: boolean) => void
	setOpen: (open: boolean) => void
	/** Closes the popover. {@link PopoverClose} calls it. */
	close: () => void
	triggerRef: RefObject<HTMLElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
}

type PopoverPositionValue = {
	floatingStyles: CSSProperties
	/** Floating-ui root context; `PopoverContent`'s `modal` trap mounts on it. */
	floatingContext: FloatingRootContext
}

export const [PopoverContext, usePopoverContext] = createContext<PopoverContextValue>('Popover')

/**
 * Where the panel of the enclosing {@link Popover} sits. Split from
 * {@link PopoverContext} because both members re-identify on every reposition
 * while the panel is open. Only the panel reads them, so the trigger stays out
 * of each `autoUpdate` tick.
 */
export const [PopoverPositionContext, usePopoverPosition] =
	createContext<PopoverPositionValue>('Popover')

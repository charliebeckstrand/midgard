'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import type { CSSProperties } from 'react'
import { createContext } from '../../core'

/**
 * The value shared through {@link TooltipContext}: the floating handles a
 * `<TooltipContent>` needs, plus the display flags (`interactive`, `enabled`)
 * its chrome reads. Built by `useTooltipState` for the DOM-anchored
 * `<Tooltip>` and by `useTooltipPointer` for the point-anchored
 * `<TooltipPointer>`.
 */
export type TooltipContextValue = {
	open: boolean
	interactive: boolean
	enabled: boolean
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	/**
	 * Floating-ui root context an interactive `<TooltipContent>`'s focus trap
	 * mounts on. Absent for the point-anchored readout, which is never
	 * `interactive` and so never traps.
	 */
	floatingContext?: FloatingRootContext
}

export const [TooltipContext, useTooltipContext] = createContext<TooltipContextValue>('Tooltip')

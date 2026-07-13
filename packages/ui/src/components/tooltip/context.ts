'use client'

import type { CSSProperties } from 'react'
import { createContext } from '../../core'

/**
 * The value shared through {@link TooltipContext}: the floating handles a
 * `<TooltipContent>` needs, plus the display flags (`interactive`, `enabled`)
 * its chrome reads. Built by `useTooltipState` for the DOM-anchored
 * `<Tooltip>` and by `usePointerTooltipState` for the point-anchored
 * `<PointerTooltip>`.
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
}

export const [TooltipContext, useTooltipContext] = createContext<TooltipContextValue>('Tooltip')

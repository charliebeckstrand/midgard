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
	 * Floating-ui root context that the focus manager of an interactive
	 * `<TooltipContent>` mounts on. Absent for the point-anchored readout, which
	 * is never `interactive`.
	 */
	floatingContext?: FloatingRootContext
	/**
	 * The id that `<TooltipTrigger>` stamps on a trigger that has no id of its
	 * own. Set only while the panel is a dialog, which the trigger names
	 * through `aria-labelledby`.
	 */
	triggerId?: string
	/**
	 * Reports whether the open panel holds a tabbable control. An `interactive`
	 * panel that holds one is a dialog. Absent for the point-anchored readout.
	 */
	reportTabbable?: (tabbable: boolean) => void
}

export const [TooltipContext, useTooltipContext] = createContext<TooltipContextValue>('Tooltip')

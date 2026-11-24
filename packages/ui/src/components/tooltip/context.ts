'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import type { CSSProperties } from 'react'
import { createContext } from '../../core/create-context'

/**
 * The value shared through {@link TooltipContext}: the floating handles a
 * `<TooltipContent>` needs, plus the display flags (`interactive`, `enabled`)
 * its chrome reads. Built by `useTooltipState` for the DOM-anchored
 * `<Tooltip>` and by `useTooltipPointer` for the point-anchored
 * `<TooltipPointer>`.
 */
export type TooltipContextValue = {
	open: boolean
	/**
	 * Whether the panel shows and goes with no animation. A `<TooltipGroup>`
	 * sets it for a tooltip that opens while a sibling is open or just closed,
	 * and for a tooltip that a sibling closes. Absent outside a group.
	 */
	instant?: boolean
	interactive: boolean
	/**
	 * Whether the panel takes the pointer. A panel that a hover opens takes it,
	 * so the reader can move onto the content (WCAG 2.2 SC 1.4.13), and so does
	 * an `interactive` panel. A panel that code places, such as an anchored name
	 * or the point readout, lets the pointer through to what is under it.
	 */
	takesPointer: boolean
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

/**
 * The part of {@link TooltipContextValue} that `<TooltipTrigger>` and
 * `<TooltipContent>` read. It holds no position, so a reposition of the panel
 * renders neither the trigger nor the element that the trigger clones.
 */
export type TooltipTriggerValue = Pick<
	TooltipContextValue,
	'open' | 'enabled' | 'setReference' | 'getReferenceProps' | 'triggerId'
>

export const [TooltipTriggerContext, useTooltipTriggerContext] =
	createContext<TooltipTriggerValue>('Tooltip')

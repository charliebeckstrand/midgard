'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { Orientation } from '../../types'
import type { PanelConfig } from './types'

type ResizableContextType = {
	orientation: Orientation
	dragging: number | null
	sizes: number[]
	panelConfigs: PanelConfig[]
	startDrag: (handleIndex: number, event: ReactPointerEvent) => void
	resize: (handleIndex: number, delta: number) => void
	/** Gives the id of the panel at an index, so a handle can name the panel that it sizes in `aria-controls`. */
	panelId: (panelIndex: number) => string
}

/**
 * Group-level context: orientation, live sizes, panel constraints, and the
 * drag/resize actions shared with descendant handles and panels. The value is
 * `null` outside a group, so a panel can render alone.
 *
 * @internal
 */
export const [ResizableContext, useOptionalResizable] = createContext<ResizableContextType | null>(
	'Resizable',
	{ default: null },
)

/**
 * Reads the group context. Throws outside a {@link ResizableGroup}, because a
 * handle has no function without a group.
 *
 * @internal
 */
export function useResizable(): ResizableContextType {
	const context = useOptionalResizable()

	if (!context) throw new Error('ResizableHandle must be used within <ResizableGroup>')

	return context
}

type ResizableIndexContextType = {
	panelIndex?: number
	handleIndex?: number
}

/**
 * Per-child position context: the panel or handle index assigned by
 * {@link ResizableGroup}. Defaults to an empty object outside a group.
 *
 * @internal
 */
export const [ResizableIndexContext, useResizableIndex] = createContext<ResizableIndexContextType>(
	'ResizableIndex',
	{ default: {} },
)

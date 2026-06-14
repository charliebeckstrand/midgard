'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { PanelConfig, ResizableOrientation } from './types'

type ResizableContextType = {
	orientation: ResizableOrientation
	dragging: number | null
	sizes: number[]
	panelConfigs: PanelConfig[]
	startDrag: (handleIndex: number, event: ReactPointerEvent) => void
	resize: (handleIndex: number, delta: number) => void
}

/**
 * Group-level context: orientation, live sizes, panel constraints, and the
 * drag/resize actions shared with descendant handles and panels.
 *
 * @internal
 */
export const [ResizableContext, useResizable] = createContext<ResizableContextType>('Resizable')

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

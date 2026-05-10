'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type ResizableDirection = Orientation

export type PanelConfig = {
	defaultSize: number
	minSize: number
	maxSize: number
}

type ResizableContextType = {
	direction: ResizableDirection
	dragging: number | null
	sizes: number[]
	panelConfigs: PanelConfig[]
	startDrag: (handleIndex: number, event: ReactPointerEvent) => void
	resize: (handleIndex: number, delta: number) => void
}

export const [ResizableProvider, useResizable] = createContext<ResizableContextType>('Resizable')

type ResizableIndexContextType = {
	panelIndex?: number
	handleIndex?: number
}

export const [ResizableIndexProvider, useResizableIndex] = createContext<ResizableIndexContextType>(
	'ResizableIndex',
	{ default: {} },
)

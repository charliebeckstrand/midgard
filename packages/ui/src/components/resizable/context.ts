'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { PanelConfig, ResizableDirection } from './types'

type ResizableContextType = {
	direction: ResizableDirection
	dragging: number | null
	sizes: number[]
	panelConfigs: PanelConfig[]
	startDrag: (handleIndex: number, event: ReactPointerEvent) => void
	resize: (handleIndex: number, delta: number) => void
}

export const [ResizableContext, useResizable] = createContext<ResizableContextType>('Resizable')

type ResizableIndexContextType = {
	panelIndex?: number
	handleIndex?: number
}

export const [ResizableIndexContext, useResizableIndex] = createContext<ResizableIndexContextType>(
	'ResizableIndex',
	{ default: {} },
)

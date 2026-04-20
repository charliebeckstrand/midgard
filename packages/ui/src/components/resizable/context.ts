'use client'

import { createContext, useContext } from 'react'

export type ResizableDirection = 'horizontal' | 'vertical'

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
	startDrag: (handleIndex: number, event: React.PointerEvent) => void
	resize: (handleIndex: number, delta: number) => void
}

const ResizableContext = createContext<ResizableContextType | undefined>(undefined)

export const ResizableProvider = ResizableContext.Provider

export function useResizable() {
	const ctx = useContext(ResizableContext)

	if (!ctx) {
		throw new Error('Resizable sub-components must be used within ResizableGroup')
	}

	return ctx
}

type ResizableIndexContextType = {
	panelIndex?: number
	handleIndex?: number
}

const ResizableIndexContext = createContext<ResizableIndexContextType>({})

export const ResizableIndexProvider = ResizableIndexContext.Provider

export function useResizableIndex() {
	return useContext(ResizableIndexContext)
}

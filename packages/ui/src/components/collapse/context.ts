'use client'

import { createContext } from '../../core/create-context'

export type CollapseContextValue = {
	open: boolean
	toggle: () => void
}

export const [CollapseProvider, useCollapseContext] =
	createContext<CollapseContextValue>('Collapse')

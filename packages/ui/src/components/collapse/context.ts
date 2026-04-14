'use client'

import { createContext } from '../../core/create-context'

export type CollapseAnimation = boolean | 'fade' | 'slide'

export type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	triggerId: string
	panelId: string
}

export const [CollapseProvider, useCollapseContext] =
	createContext<CollapseContextValue>('Collapse')

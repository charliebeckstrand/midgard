'use client'

import { createContext } from '../../core/create-context'

type CollapseAnimation = boolean | 'fade' | 'slide'

type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	triggerId: string
	panelId: string
}

export const [CollapseProvider, useCollapseContext] =
	createContext<CollapseContextValue>('Collapse')

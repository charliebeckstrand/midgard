'use client'

import { createContext } from '../../core/create-context'

type CollapseAnimation = boolean | 'fade' | 'slide'

type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	triggerProps: { id: string; 'aria-controls': string; 'aria-expanded'?: boolean }
	panelProps: { id: string; 'aria-labelledby': string }
}

export const [CollapseContext, useCollapseContext] = createContext<CollapseContextValue>('Collapse')

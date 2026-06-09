'use client'

import { createContext } from '../../core'
import type { A11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'

type CollapseAnimation = boolean | 'fade' | 'slide'

type CollapseContextValue = {
	open: boolean
	toggle: () => void
	animate: CollapseAnimation
	triggerProps: A11yDisclosure['triggerProps']
	panelProps: A11yDisclosure['panelProps']
}

export const [CollapseContext, useCollapseContext] = createContext<CollapseContextValue>('Collapse')

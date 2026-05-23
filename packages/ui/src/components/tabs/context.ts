'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes'
import type { Orientation } from '../../types'

export type TabsVariant = 'tab' | 'segment'
export type TabsOrientation = Orientation
export type TabsSize = Step

type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
	size: TabsSize
}

export const [TabsProvider, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

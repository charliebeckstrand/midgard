'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type TabsVariant = 'tab' | 'segment'
export type TabsOrientation = Orientation

export type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
}

export const [TabsProvider, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

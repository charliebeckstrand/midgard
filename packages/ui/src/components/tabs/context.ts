'use client'

import { createContext, useContext } from 'react'
import type { Orientation } from '../../types'

export type TabsVariant = 'tab' | 'segment'
export type TabsOrientation = Orientation

export type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export const TabsProvider = TabsContext.Provider

export function useTabsContext() {
	return useContext(TabsContext)
}

'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes/ryu/sun'
import type { Orientation } from '../../types'

export type TabsVariant = 'tab' | 'segment'
export type TabsOrientation = Orientation
export type TabsSize = Step

export type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
	size: TabsSize
	/** Stable scope used to auto-wire `aria-controls` / `aria-labelledby` between Tab and TabPanel when both carry a matching `value`. */
	baseId: string
}

export const [TabsProvider, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

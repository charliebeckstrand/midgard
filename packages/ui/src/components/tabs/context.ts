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
	/** Base id a `Tab` and its `TabContent` derive a matched id pair from, keyed by `value`. */
	baseId: string
	/** `true` while a `TabContents` that keeps inactive panels mounted (fade mode) is rendered; inactive tabs may then reference their panels. */
	panelsMounted: boolean
	/** Registers a `TabContents`; returns the deregister cleanup. */
	registerMountedPanels: () => () => void
}

export const [TabsContext, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

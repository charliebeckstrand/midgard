'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes'
import type { Orientation } from '../../types'

/** Visual treatment of a tab group: underlined `tab` triggers or a segmented control. */
export type TabsVariant = 'tab' | 'segment'
/** Tab-list flow axis; the `segment` variant is always horizontal. */
export type TabsOrientation = Orientation
export type TabsSize = Step

type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
	size: TabsSize
	/** Base id a `Tab` and its `TabContent` derive a matched id pair from, keyed by `value`. */
	baseId: string
	/** `true` while a `TabContents` holds every inactive panel mounted (`mount="always"`); inactive tabs may then reference their panels via `aria-controls`. */
	panelsMounted: boolean
	/** Registers a `TabContents`; returns the deregister cleanup. */
	registerMountedPanels: () => () => void
}

export const [TabsContext, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

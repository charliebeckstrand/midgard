'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

/** Visual treatment of a tab group: underlined `tab` triggers or a segmented control. @internal */
export type TabsVariant = 'tab' | 'segment'
/** Tab-list flow axis; the `segment` variant is always horizontal. @internal */
export type TabsOrientation = Orientation

type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
	/** Base id a `Tab` and its `TabContent` derive a matched id pair from, keyed by `value`. */
	baseId: string
	/** `true` while a `TabContents` holds every inactive panel mounted (`mount="always"`); inactive tabs can then reference their panels via `aria-controls`. */
	panelsMounted: boolean
	/** Registers a `TabContents`; returns the deregister cleanup. */
	registerMountedPanels: () => () => void
	/** `true` while the group renders a `TabContents`. A `segment` tab references its panel only then, because a segmented control often has no panels. */
	panelsPresent: boolean
	/** Registers a `TabContents` of any mount policy; returns the deregister cleanup. */
	registerPanels: () => () => void
}

export const [TabsContext, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

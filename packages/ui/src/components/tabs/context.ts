'use client'

import { createContext } from '../../core/create-context'
import type { Orientation } from '../../types/orientation'

/** Visual treatment of a tab group: underlined `tab` triggers or a segmented control. */
export type TabsVariant = 'tab' | 'segment'
/** Tab-list flow axis; the `segment` variant is always horizontal. */
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
	/**
	 * `true` for a `segment` group with no panels. Such a group picks a value and
	 * shows no panel, so its list is a `radiogroup` and each item is a `radio`.
	 */
	choice: boolean
}

export const [TabsContext, useTabsContext] = createContext<TabsContextValue | undefined>('Tabs', {
	default: undefined,
})

/**
 * How a `segment` group with no panels selects an item. `Segment` gives it from
 * its `activation` prop, and each `Tabs` reads it. A `Tabs` gives `automatic`
 * to its children, so a group inside a manual `Segment` does not take it.
 */
export const [TabsActivationContext, useTabsActivation] = createContext<'automatic' | 'manual'>(
	'TabsActivation',
	{ default: 'automatic' },
)

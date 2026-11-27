'use client'

import { createContext } from '../../core/create-context'
import type { Orientation } from '../../types/orientation'
import type { TabsPanels } from './use-tabs-panels'

/** Visual treatment of a tab group: underlined `tab` triggers or a segmented control. */
export type TabsVariant = 'tab' | 'segment'
/** Tab-list flow axis; the `segment` variant is always horizontal. */
export type TabsOrientation = Orientation

type TabsContextValue = {
	variant: TabsVariant
	orientation: TabsOrientation
	/** Base id a `Tab` and its `TabContent` derive a matched id pair from, keyed by `value`. */
	baseId: string
	/**
	 * The registered panels of the group. A store and not a context value,
	 * because the counts change after the mount ({@link TabsPanels}).
	 */
	panels: TabsPanels
	/** How a `segment` group with no panels selects an item, from the enclosing `Segment`. */
	activation: 'automatic' | 'manual'
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

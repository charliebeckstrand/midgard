'use client'

import { useSyncExternalStore } from 'react'
import { createEmitter } from '../../utilities/emitter'
import { noopSubscribe } from '../../utilities/noop'
import { useTabsContext } from './context'

/**
 * The panels that are registered with a `Tabs`. A `TabContents` and each
 * `TabContent` outside a `TabContents` register in an effect, so the counts
 * change after the mount.
 *
 * @remarks
 * The counts are in a store and not in the value of `TabsContext`. A change of
 * a context value goes to each boundary below the provider that has not
 * hydrated. React cannot know whether that boundary reads the context, so it
 * hydrates each one at the blocking lane. The panels hold the content of the
 * page, so a context change after hydration made each Suspense and Activity
 * boundary in the panels hydrate at once. With the store, the value of the
 * context does not change, and a registration renders only the tab items that
 * read the counts.
 *
 * @internal
 */
export type TabsPanels = {
	/** Registers a `TabContents` that holds every panel mounted (`mount="always"`). Returns the release. */
	registerMounted: () => () => void
	/** Registers a `TabContents` of any mount policy. Returns the release. */
	register: () => () => void
	subscribe: (listener: () => void) => () => void
	/** `true` while a registered `TabContents` holds every inactive panel mounted. */
	mounted: () => boolean
	/** `true` while the group renders a `TabContents` or a `TabContent`. */
	present: () => boolean
}

/** Makes the {@link TabsPanels} store of one `Tabs`. @internal */
export function createTabsPanels(): TabsPanels {
	let mountedCount = 0

	let presentCount = 0

	const change = createEmitter()

	return {
		registerMounted() {
			mountedCount++

			change.emit()

			return () => {
				mountedCount--

				change.emit()
			}
		},
		register() {
			presentCount++

			change.emit()

			return () => {
				presentCount--

				change.emit()
			}
		},
		subscribe: change.subscribe,
		mounted: () => mountedCount > 0,
		present: () => presentCount > 0,
	}
}

/** The snapshot of the server and of the hydration render: no panel registered. */
const none = () => false

/** The store of a group with no `Tabs`. It has no panels. */
const NO_PANELS = { subscribe: noopSubscribe, mounted: none, present: none }

/**
 * The panel state of the nearest `Tabs`, for a tab item. The server and the
 * hydration render read no panels, as the server knows of none. The state of
 * the client follows after the hydration.
 *
 * @internal
 */
export function useTabsPanels(): {
	panelsMounted: boolean
	panelsPresent: boolean
	choice: boolean
} {
	const tabsContext = useTabsContext()

	const panels = tabsContext?.panels ?? NO_PANELS

	const panelsMounted = useSyncExternalStore(panels.subscribe, panels.mounted, none)

	const panelsPresent = useSyncExternalStore(panels.subscribe, panels.present, none)

	// A segmented control with no panels picks a value, as a set of radios does.
	// The role `tab` tells a reader that a panel shows, so the group takes the
	// radio roles until a panel registers. A group with manual activation keeps
	// the tab roles, because a radio selects on each arrow key.
	const choice =
		tabsContext?.variant === 'segment' && !panelsPresent && tabsContext.activation === 'automatic'

	return { panelsMounted, panelsPresent, choice }
}

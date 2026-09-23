'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useDashboardStoreContext } from './context'
import type { DashboardState, DashboardView } from './engine/dashboard-store'

/**
 * Reads one value from the store of the nearest `Dashboard`. The component
 * renders again only when the selected value changes by `Object.is`.
 *
 * @remarks
 * Return a value from the store, a primitive, or a cell from the view. The view
 * keeps each cell object whose geometry does not change, so a cell selector is
 * stable. Do not return a fresh object or array: each read then differs, and
 * React renders the component in a loop.
 *
 * @internal
 */
export function useDashboardStore<T>(select: (view: DashboardView, state: DashboardState) => T): T {
	const store = useDashboardStoreContext()

	const read = useCallback(() => select(store.getView(), store.getState()), [store, select])

	return useSyncExternalStore(store.subscribe, read, read)
}

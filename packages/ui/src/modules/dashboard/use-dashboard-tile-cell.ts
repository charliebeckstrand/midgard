'use client'

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useDashboardStoreContext } from './context'
import {
	type DashboardCell,
	type DashboardTileDemands,
	resolveCell,
} from './engine/dashboard-layout'
import type { DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/**
 * Registers the demands of the tile `id`, and returns its painted cell.
 *
 * Mount registers and unmount unregisters. A change of the demands updates them
 * in place, so the tile keeps its mount order, which places a tile with no entry.
 * Such a tile takes its `defaultSize`.
 *
 * A tile registers in a layout effect, so the server never sees it register. Until
 * then, the tile resolves its cell from its own layout entry and its own demands. The server
 * markup therefore matches the first client render. A tile with no entry has no
 * cell until it registers.
 *
 * @internal
 */
export function useDashboardTileCell(
	id: string,
	demands: DashboardTileDemands,
): DashboardCell | undefined {
	const store = useDashboardStoreContext()

	const { ratio, minWidth, label, defaultSize } = demands

	// The span registers as two numbers, so a fresh size object from the app is no change.
	const defaultW = defaultSize?.w

	const defaultH = defaultSize?.h

	const latest = useRef(demands)

	latest.current = demands

	useLayoutEffect(() => store.register(id, latest.current), [store, id])

	useLayoutEffect(() => {
		store.register(id, {
			ratio,
			minWidth,
			label,
			defaultSize: defaultW === undefined ? undefined : { w: defaultW, h: defaultH },
		})
	}, [store, id, ratio, minWidth, label, defaultW, defaultH])

	const registered = useDashboardStore(
		useCallback((view: DashboardView) => view.cells.get(id), [id]),
	)

	// The entry matters only until the tile registers. A registered tile stops
	// reading it, so a new layout array from the app never renders it again.
	const entry = useDashboardStore(
		useCallback(
			(view: DashboardView) => (view.cells.has(id) ? undefined : view.entries.get(id)),
			[id],
		),
	)

	const columns = useDashboardStore((_, state) => state.columns)

	const fallback = useMemo(
		() => (entry === undefined ? undefined : resolveCell(entry, { ratio, minWidth }, columns)),
		[entry, ratio, minWidth, columns],
	)

	return registered ?? fallback
}

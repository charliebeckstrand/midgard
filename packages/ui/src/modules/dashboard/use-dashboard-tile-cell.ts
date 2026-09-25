'use client'

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useDashboardStoreContext } from './context'
import {
	type DashboardCell,
	type DashboardTileDemands,
	type DashboardTileSize,
	resolveCell,
} from './engine/dashboard-layout'
import type { DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** A span limit from its two axes, or `undefined` when neither axis is set. */
function bound(
	w: number | undefined,
	h: number | undefined,
): Partial<DashboardTileSize> | undefined {
	return w === undefined && h === undefined ? undefined : { w, h }
}

/**
 * Registers the demands of the tile `id`, and returns its painted cell.
 *
 * Mount registers and unmount unregisters. A change of the demands updates them
 * in place, so the tile keeps its mount order, which places a tile with no entry.
 * Such a tile takes its `defaultSize`. In development, a mount logs an error when
 * another tile already holds the id.
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

	const { ratio, minWidth, label, defaultSize, minSize, maxSize } = demands

	// Each span registers as numbers, so a fresh size object from the app is no change.
	const defaultW = defaultSize?.w

	const defaultH = defaultSize?.h

	const minW = minSize?.w

	const minH = minSize?.h

	const maxW = maxSize?.w

	const maxH = maxSize?.h

	const latest = useRef(demands)

	latest.current = demands

	useLayoutEffect(() => {
		// The store keys a registration by id alone, so two tiles with one id share one registration.
		// Each cleanup runs before the next effect, so StrictMode and a swap in one commit stay silent.
		if (process.env.NODE_ENV !== 'production' && store.getState().demands.has(id)) {
			console.error(
				`Dashboard: two tiles share the id "${id}". The unmount of one also unregisters the other. Give each tile a unique id.`,
			)
		}

		return store.register(id, latest.current)
	}, [store, id])

	useLayoutEffect(() => {
		store.register(id, {
			ratio,
			minWidth,
			label,
			defaultSize: defaultW === undefined ? undefined : { w: defaultW, h: defaultH },
			minSize: bound(minW, minH),
			maxSize: bound(maxW, maxH),
		})
	}, [store, id, ratio, minWidth, label, defaultW, defaultH, minW, minH, maxW, maxH])

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

'use client'

import { useCallback, useLayoutEffect, useMemo } from 'react'
import { useDashboardStoreContext } from './context'
import {
	type DashboardCell,
	type DashboardTileDemands,
	type DashboardTileSize,
	resolveCell,
} from './engine/dashboard-layout'
import type { DashboardState, DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** A span limit from its two axes, or `undefined` when neither axis is set. */
function bound(
	w: number | undefined,
	h: number | undefined,
): Partial<DashboardTileSize> | undefined {
	return w === undefined && h === undefined ? undefined : { w, h }
}

/**
 * The geometry of a cell as one string, or `''` for no cell. A selector compares
 * the string by value, so an equal cell from a new source renders nothing.
 */
function cellKey(cell: DashboardCell | undefined): string {
	return cell === undefined ? '' : `${cell.x} ${cell.y} ${cell.w} ${cell.h} ${cell.static}`
}

/** The cell of the tile `id` that `key` writes, or `undefined` for the empty key. */
function keyCell(id: string, key: string): DashboardCell | undefined {
	if (key === '') return undefined

	const [x, y, w, h, fixed] = key.split(' ')

	return { id, x: Number(x), y: Number(y), w: Number(w), h: Number(h), static: fixed === 'true' }
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
 * The cell keeps its object while its geometry holds. Thus a registration that
 * gives the cell of the entry does not render the tile again.
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

	// The effect below registers the tile, and this cleanup unregisters it on an unmount
	// or a new id. So a change of the demands keeps the registration in its place.
	useLayoutEffect(() => {
		// The store keys a registration by id alone, so two tiles with one id share one registration.
		// Each cleanup runs before the next effect, so StrictMode and a swap in one commit stay silent.
		if (process.env.NODE_ENV !== 'production' && store.getState().demands.has(id)) {
			console.error(
				`Dashboard: two tiles share the id "${id}". The unmount of one also unregisters the other. Give each tile a unique id.`,
			)
		}

		return () => store.unregister(id)
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

	// The entry matters only until the tile registers. A registered tile stops
	// reading it, so a new layout array from the app never renders it again.
	const key = useDashboardStore(
		useCallback(
			(view: DashboardView, state: DashboardState) => {
				const registered = view.cells.get(id)

				if (registered !== undefined) return cellKey(registered)

				const entry = view.entries.get(id)

				// The cell reads only the ratio of the demands.
				return entry === undefined ? '' : cellKey(resolveCell(entry, { ratio }, state.columns))
			},
			[id, ratio],
		),
	)

	return useMemo(() => keyCell(id, key), [id, key])
}

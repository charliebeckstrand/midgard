'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import { clamp } from '../../utilities'
import type { CellConstraints } from './dashboard-constraints'
import {
	appendCell,
	DEFAULT_CELL_HEIGHT,
	DEFAULT_CELL_WIDTH,
	deriveHeight,
	type LayoutCell,
} from './dashboard-layout'
import type { DashboardLayoutBinding, DashboardLayoutItem } from './types'

/** Options for {@link useDashboardLayout}. @internal */
type DashboardLayoutOptions = {
	/** The grid's `layout` binding, possibly absent (uncontrolled from nothing). */
	layout: DashboardLayoutBinding | undefined
	/** The grid's column count. */
	columns: number
}

/** What {@link useDashboardLayout} returns. @internal */
type DashboardLayoutState = {
	/** Registers an item's content demands; returns the unregister. */
	register: (id: string, constraints: CellConstraints) => () => void
	/**
	 * The canonical cells, the layout the tiles paint: bound entries resolved,
	 * unknowns auto-slotted, compacted. Geometry is proportional, so this same
	 * layout scales to every container width — nothing re-derives on resize.
	 */
	rendered: LayoutCell[]
	/** The live constraint registry, for the gesture hooks' ratio lookups. */
	constraints: ReadonlyMap<string, CellConstraints>
	/** Commits a gesture's cells as the canonical layout and returns the emitted items. */
	commit: (cells: readonly LayoutCell[]) => DashboardLayoutItem[]
	/** The canonical layout in its public shape — gesture-start payloads. */
	publicLayout: DashboardLayoutItem[]
}

/**
 * One saved item resolved to an engine cell: spans clamped into the column
 * range, the height derived for a ratio-locked item (a stored `h` is
 * ignored — the ratio owns it) and defaulted for a free-form one saved
 * without it.
 *
 * @internal
 */
function resolveCell(
	item: DashboardLayoutItem,
	demands: CellConstraints,
	columns: number,
): LayoutCell {
	const w = clamp(Math.round(item.w), 1, columns)

	const h =
		demands.ratio === undefined
			? Math.max(1, Math.round(item.h ?? DEFAULT_CELL_HEIGHT))
			: deriveHeight(w, demands.ratio)

	return {
		id: item.id,
		x: clamp(Math.round(item.x), 0, columns - w),
		y: Math.max(0, Math.round(item.y)),
		w,
		h,
		static: item.static ?? false,
	}
}

/**
 * The grid's layout state: the controlled / uncontrolled binding, the item
 * constraint registry, and the canonical layout the tiles paint — what
 * edits apply to and commits emit. Geometry is proportional, so this one
 * layout scales to every container width and nothing re-derives on resize.
 *
 * The canonical cells resolve from the binding against the mounted items:
 * entries without a mounted item drop out (removal leaves its cell open —
 * the canvas never repacks, and the canonical array is untouched), mounted
 * items without an entry auto-slot below the last row in mount order, and
 * duplicates keep their first entry. Nothing is emitted for any of that —
 * the binding only fires on {@link DashboardLayoutState.commit}, a
 * gesture's explicit mutation.
 *
 * @internal
 */
export function useDashboardLayout({
	layout,
	columns,
}: DashboardLayoutOptions): DashboardLayoutState {
	const [value, setValue] = useControllable<DashboardLayoutItem[]>({
		value: layout?.value,
		defaultValue: layout?.defaultValue,
		// Commits always pass an array, so the binding never sees the hook's
		// cleared-to-`undefined` shape.
		onValueChange: (next) => layout?.onValueChange?.(next ?? []),
	})

	// The registry lives in a ref with a version tick: registration happens in
	// item layout effects, and the tick re-derives the memos without cloning
	// the map per item on a mount burst.
	const constraintsRef = useRef(new Map<string, CellConstraints>())

	const [registryVersion, setRegistryVersion] = useState(0)

	const register = useCallback((id: string, constraints: CellConstraints) => {
		constraintsRef.current.set(id, constraints)

		setRegistryVersion((version) => version + 1)

		return () => {
			constraintsRef.current.delete(id)

			setRegistryVersion((version) => version + 1)
		}
	}, [])

	const canonical = useMemo(() => {
		// The tick is the memo's real dependency; the ref itself never changes.
		void registryVersion

		const constraints = constraintsRef.current

		const seen = new Set<string>()

		const bound: LayoutCell[] = []

		for (const item of value ?? []) {
			const demands = constraints.get(item.id)

			if (demands === undefined || seen.has(item.id)) continue

			seen.add(item.id)

			bound.push(resolveCell(item, demands, columns))
		}

		let cells = bound

		for (const [id, demands] of constraints) {
			if (seen.has(id)) continue

			cells = appendCell(
				cells,
				resolveCell({ id, x: 0, y: 0, w: DEFAULT_CELL_WIDTH }, demands, columns),
			)
		}

		return cells
	}, [value, registryVersion, columns])

	const toPublic = useCallback((cells: readonly LayoutCell[]): DashboardLayoutItem[] => {
		return cells.map((cell) => {
			const demands = constraintsRef.current.get(cell.id)

			return {
				id: cell.id,
				x: cell.x,
				y: cell.y,
				w: cell.w,
				// A ratio-locked cell emits without its derived height, so a saved
				// layout never carries a value a later ratio change would fight.
				...(demands?.ratio === undefined && { h: cell.h }),
				...(cell.static && { static: true }),
			}
		})
	}, [])

	const commit = useCallback(
		(cells: readonly LayoutCell[]): DashboardLayoutItem[] => {
			const next = toPublic(cells)

			setValue(next)

			return next
		},
		[toPublic, setValue],
	)

	const publicLayout = useMemo(() => toPublic(canonical), [toPublic, canonical])

	return {
		register,
		rendered: canonical,
		constraints: constraintsRef.current,
		commit,
		publicLayout,
	}
}

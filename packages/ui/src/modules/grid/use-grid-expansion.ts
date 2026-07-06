'use client'

import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import { toggleItem } from '../../utilities'
import type { GridExpandable } from './grid-data-types'

/** Stable empty expansion default; read-only, replaced wholesale on change. @internal */
const EMPTY_EXPANSION: Set<string | number> = new Set()

/** Resolved master-detail state for the flat body. @internal */
export type GridExpansionResult<T> = {
	/** Whether an expandable binding is active — the gate for the expander chevron and detail rows. */
	active: boolean
	/** The expanded row keys. */
	expanded: Set<string | number>
	/** Toggles a row key open or closed. */
	toggle: (key: string | number) => void
	/** The detail-panel renderer, or `null` when inactive. */
	render: ((row: T) => ReactNode) | null
	/** Whether a given row may expand at all. */
	rowExpandable: (row: T) => boolean
}

/**
 * Resolves the {@link GridExpandable} binding into master-detail state: the
 * controllable expanded-key set (uncontrolled from `defaultValue`, else an empty
 * set), a stable per-key toggle, the detail renderer, and the per-row
 * expandability predicate. Inert — `active: false`, an empty set — when the grid
 * carries no `expandable` binding, so the flat body reads one shape either way.
 *
 * @param config - The `expandable` binding, or `undefined` when the grid isn't expandable.
 * @internal
 */
export function useGridExpansion<T>(config: GridExpandable<T> | undefined): GridExpansionResult<T> {
	const [expanded, setExpanded] = useControllable<Set<string | number>>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_EXPANSION,
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_EXPANSION),
	})

	// The functional-updater form keeps the toggle referentially stable across
	// expansion edits, so the memoized rows don't churn when a panel opens.
	const toggle = useCallback(
		(key: string | number) => setExpanded((prev) => toggleItem(prev ?? EMPTY_EXPANSION, key)),
		[setExpanded],
	)

	return {
		active: config != null,
		expanded: expanded ?? EMPTY_EXPANSION,
		toggle,
		render: config?.render ?? null,
		rowExpandable: config?.rowExpandable ?? (() => true),
	}
}

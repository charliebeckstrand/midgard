'use client'

import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { toggleItem } from '../../utilities/toggle-item'
import type { GridExpansionResult } from './engine/grid-group/resolve'
import type { GridExpandable } from './grid-data-types'

/** Stable empty expansion default; read-only, replaced wholesale on change. @internal */
const EMPTY_EXPANSION: Set<string | number> = new Set()

/** Stable default predicate for grids that don't restrict which rows expand. @internal */
const ALWAYS_EXPANDABLE = () => true

/**
 * Resolves the {@link GridExpandable} binding into master-detail state: the
 * controllable expanded-key set (uncontrolled from `defaultValue`, else an empty
 * set). The state also holds a stable per-key toggle, the detail renderer, and
 * the per-row expandability predicate. Inert (`active: false`, an empty set) when the grid
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

	const active = config != null
	const render = config?.render ?? null
	const rowExpandable = config?.rowExpandable ?? ALWAYS_EXPANDABLE

	// One object while its parts hold, so the memoized body does not render again.
	return useMemo(
		() => ({ active, expanded: expanded ?? EMPTY_EXPANSION, toggle, render, rowExpandable }),
		[active, expanded, toggle, render, rowExpandable],
	)
}

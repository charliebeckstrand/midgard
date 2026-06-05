'use client'

import { useMemo } from 'react'
import { useControllable } from '../../hooks'
import { EMPTY_SET } from './data-table-constants'

type ColumnLike = { id: string | number }

type DataTableColumnVisibilityOptions<T extends ColumnLike> = {
	columns: T[]
	/** Controlled column order, as a list of column ids. */
	order?: (string | number)[]
	/** Initial order when uncontrolled. Defaults to the columns' own order. */
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void
	/** Controlled set of hidden column ids. */
	hidden?: Set<string | number>
	/** Initial hidden set when uncontrolled. */
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void
}

/**
 * Controllable column order + hidden-set state shared by the data table and
 * the standalone column manager. Owns the default-order derivation (the
 * columns' own order), the two `useControllable` bindings with their
 * undefined-coalescing, and the id → column lookup map. The setters are the
 * raw `useControllable` setters, so callers can pass a value or an updater.
 */
export function useDataTableColumnVisibility<T extends ColumnLike>({
	columns,
	order,
	defaultOrder,
	onOrderChange,
	hidden,
	defaultHidden,
	onHiddenChange,
}: DataTableColumnVisibilityOptions<T>) {
	const fallbackOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [resolvedOrder = fallbackOrder, setOrder] = useControllable<(string | number)[]>({
		value: order,
		defaultValue: defaultOrder ?? fallbackOrder,
		onValueChange: (next) => onOrderChange?.(next ?? []),
	})

	const [resolvedHidden = defaultHidden ?? EMPTY_SET, setHidden] = useControllable<
		Set<string | number>
	>({
		value: hidden,
		defaultValue: defaultHidden ?? EMPTY_SET,
		onValueChange: (next) => onHiddenChange?.(next ?? new Set<string | number>()),
	})

	const byId = useMemo(() => {
		const map = new Map<string | number, T>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

	return { order: resolvedOrder, setOrder, hidden: resolvedHidden, setHidden, byId }
}

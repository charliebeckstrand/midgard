'use client'

import { type ReactNode, useCallback } from 'react'
import { buildColumnGroupMenu } from './grid-context-menu-utilities'
import type { GridColumnGroup } from './grid-group-types'
import type { GridMenuItem } from './types'

/**
 * Resolves the column-group band menu for a right-clicked group by its id, or
 * `null` when grouping is off or the group offers no action. Backs the badge
 * menu's Clear color / Manage columns items; clearing commits the recolored
 * groups through the binding {@link useGridGroup} owns.
 *
 * @internal
 */
export function useGridColumnGroupMenu(args: {
	groups: GridColumnGroup[]
	setGroups: (groups: GridColumnGroup[]) => void
	/** Whether column groups are configured — off leaves the band inert. */
	enabled: boolean
	/** Opens the column-manager dialog, or `null` when none is reachable. */
	chooseColumns: (() => void) | null
	/** Label for the "Manage columns" item. */
	manageLabel: ReactNode
}): (id: string) => GridMenuItem[] | null {
	const { groups, setGroups, enabled, chooseColumns, manageLabel } = args

	return useCallback(
		(id: string): GridMenuItem[] | null => {
			if (!enabled) return null

			const group = groups.find((candidate) => String(candidate.id) === id)

			if (!group) return null

			const items = buildColumnGroupMenu({
				group,
				onClearColor: () =>
					setGroups(groups.map((g) => (g.id === group.id ? { ...g, color: undefined } : g))),
				chooseColumns,
				manageLabel,
			})

			return items.length > 0 ? items : null
		},
		[groups, setGroups, enabled, chooseColumns, manageLabel],
	)
}

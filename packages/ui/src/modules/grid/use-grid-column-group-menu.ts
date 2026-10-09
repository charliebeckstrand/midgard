'use client'

import { type ReactNode, useCallback } from 'react'
import { columnLabel } from './engine/grid-column/label'
import type { GridMenuResolution } from './engine/grid-menu-targeting'
import { recolorGroupIn } from './engine/grid-zone/map'
import { buildColumnGroupMenu } from './grid-context-menu-utilities'
import type { GridColumnGroup } from './grid-group-types'

/**
 * Resolves the column-group band menu for a right-clicked group by its id, or
 * `null` when grouping is off or the group offers no action. The menu takes
 * the name "<group> group menu". Backs the badge
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
}): (id: string) => GridMenuResolution | null {
	const { groups, setGroups, enabled, chooseColumns, manageLabel } = args

	return useCallback(
		(id: string): GridMenuResolution | null => {
			if (!enabled) return null

			const group = groups.find((candidate) => String(candidate.id) === id)

			if (!group) return null

			const items = buildColumnGroupMenu({
				group,
				onClearColor: () => setGroups(recolorGroupIn(groups, group.id, undefined)),
				chooseColumns,
				manageLabel,
			})

			return items.length > 0 ? { items, name: `${columnLabel(group)} group menu` } : null
		},
		[groups, setGroups, enabled, chooseColumns, manageLabel],
	)
}

'use client'

import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import { GridColumnManager } from './grid-column-manager'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumnManagerItem, GridColumnManagerPreset } from './types'

/** Props for {@link GridColumnManagerDialog}. @internal */
type GridColumnManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	columns: GridColumnManagerItem[]
	order: (string | number)[]
	onOrderChange: (order: (string | number)[]) => void
	hidden: Set<string | number>
	onHiddenChange: (hidden: Set<string | number>) => void
	/** Pins a column to an edge, or unpins it with `false`; backs the manager's per-column pin control. */
	onPinChange: (id: string | number, side: 'left' | 'right' | false) => void
	/** Column groups the editor mutates, or `undefined` when grouping is off. */
	groups?: GridColumnGroup[]
	/** Commits the next groups from the editor; paired with `groups` to enable it. */
	onGroupsChange?: (groups: GridColumnGroup[]) => void
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Controlled {@link Dialog} hosting the {@link GridColumnManager}. Its two entry
 * points live elsewhere: the column-manager trigger in {@link GridToolbar} and
 * the grid's "Manage columns" header context-menu item. {@link Grid} mounts it
 * whenever either entry point can reach it.
 *
 * @internal
 */
export function GridColumnManagerDialog({
	open,
	onOpenChange,
	label,
	columns,
	order,
	onOrderChange,
	hidden,
	onHiddenChange,
	onPinChange,
	groups,
	onGroupsChange,
	onSavePreset,
}: GridColumnManagerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle>{label}</DialogTitle>
			<DialogBody>
				<GridColumnManager
					columns={columns}
					order={order}
					onOrderChange={onOrderChange}
					hidden={hidden}
					onHiddenChange={onHiddenChange}
					onPinChange={onPinChange}
					groups={groups}
					onGroupsChange={onGroupsChange}
					onSavePreset={onSavePreset}
				/>
			</DialogBody>
			<DialogFooter>
				<Button variant="plain" onClick={() => onOpenChange(false)}>
					Done
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

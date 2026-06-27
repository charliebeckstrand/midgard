'use client'

import { SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import { Icon } from '../../components/icon'
import { Toolbar } from '../../components/toolbar'
import { GridColumnManager } from './grid-column-manager'
import type { GridColumnManagerItem, GridColumnManagerPreset } from './types'

/** Props for {@link GridColumnManagerDialog}. @internal */
type GridColumnManagerDialogProps = {
	/** Render the toolbar trigger button; the dialog itself is always controlled. */
	enabled: boolean
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	columns: GridColumnManagerItem[]
	order: (string | number)[]
	onOrderChange: (order: (string | number)[]) => void
	hidden: Set<string | number>
	onHiddenChange: (hidden: Set<string | number>) => void
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Controlled {@link Dialog} hosting the {@link GridColumnManager}, opened by its
 * own toolbar button when `enabled` and/or by the grid's "Manage columns"
 * context-menu item. {@link Grid} renders it when a column manager is configured
 * or reachable from a menu.
 *
 * @internal
 */
export function GridColumnManagerDialog({
	enabled,
	open,
	onOpenChange,
	label,
	columns,
	order,
	onOrderChange,
	hidden,
	onHiddenChange,
	onSavePreset,
}: GridColumnManagerDialogProps) {
	return (
		<>
			{enabled && (
				<Toolbar aria-label="Column management">
					<Button variant="plain" aria-haspopup="dialog" onClick={() => onOpenChange(true)}>
						<Icon icon={<SlidersHorizontal />} />
						{label}
					</Button>
				</Toolbar>
			)}

			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogTitle>{label}</DialogTitle>
				<DialogBody>
					<GridColumnManager
						columns={columns}
						order={order}
						onOrderChange={onOrderChange}
						hidden={hidden}
						onHiddenChange={onHiddenChange}
						onSavePreset={onSavePreset}
					/>
				</DialogBody>
				<DialogFooter>
					<Button variant="plain" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}

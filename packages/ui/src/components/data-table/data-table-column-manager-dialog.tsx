'use client'

import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../dialog'
import { Icon } from '../icon'
import { Toolbar } from '../toolbar'
import { DataTableColumnManager } from './data-table-column-manager'
import type { DataTableColumnManagerItem, DataTableColumnManagerPreset } from './types'

/** Props for {@link DataTableColumnManagerDialog}. @internal */
type DataTableColumnManagerDialogProps = {
	label: ReactNode
	columns: DataTableColumnManagerItem[]
	order: (string | number)[]
	onOrderChange: (order: (string | number)[]) => void
	hidden: Set<string | number>
	onHiddenChange: (hidden: Set<string | number>) => void
	onSavePreset?: (preset: DataTableColumnManagerPreset) => void
}

/**
 * Toolbar button that opens a {@link Dialog} hosting the
 * {@link DataTableColumnManager}; {@link DataTable} renders it when a column
 * manager is configured.
 *
 * @internal
 */
export function DataTableColumnManagerDialog({
	label,
	columns,
	order,
	onOrderChange,
	hidden,
	onHiddenChange,
	onSavePreset,
}: DataTableColumnManagerDialogProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Toolbar aria-label="Column management">
				<Button variant="plain" size="sm" aria-haspopup="dialog" onClick={() => setOpen(true)}>
					<Icon icon={<SlidersHorizontal />} />
					{label}
				</Button>
			</Toolbar>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTitle>{label}</DialogTitle>
				<DialogBody>
					<DataTableColumnManager
						columns={columns}
						order={order}
						onOrderChange={onOrderChange}
						hidden={hidden}
						onHiddenChange={onHiddenChange}
						onSavePreset={onSavePreset}
					/>
				</DialogBody>
				<DialogFooter>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}

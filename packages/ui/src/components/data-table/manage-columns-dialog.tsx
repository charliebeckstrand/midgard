'use client'

import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../dialog'
import { Icon } from '../icon'
import { Toolbar } from '../toolbar'
import {
	DataTableColumnManager,
	type DataTableColumnManagerItem,
	type DataTableColumnManagerPreset,
} from './column-manager'

export type DataTableManageColumnsDialogProps = {
	label: ReactNode
	columns: DataTableColumnManagerItem[]
	order: (string | number)[]
	onOrderChange: (order: (string | number)[]) => void
	hidden: Set<string | number>
	onHiddenChange: (hidden: Set<string | number>) => void
	onSavePreset?: (preset: DataTableColumnManagerPreset) => void
}

export function DataTableManageColumnsDialog({
	label,
	columns,
	order,
	onOrderChange,
	hidden,
	onHiddenChange,
	onSavePreset,
}: DataTableManageColumnsDialogProps) {
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
				<DialogActions>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}

'use client'

import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import { Icon } from '../../components/icon'
import { Toolbar } from '../../components/toolbar'
import { GridColumnManager } from './grid-column-manager'
import type { GridColumnManagerItem, GridColumnManagerPreset } from './types'

/** Props for {@link GridColumnManagerDialog}. @internal */
type GridColumnManagerDialogProps = {
	label: ReactNode
	columns: GridColumnManagerItem[]
	order: (string | number)[]
	onOrderChange: (order: (string | number)[]) => void
	hidden: Set<string | number>
	onHiddenChange: (hidden: Set<string | number>) => void
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Toolbar button that opens a {@link Dialog} hosting the
 * {@link GridColumnManager}; {@link Grid} renders it when a column
 * manager is configured.
 *
 * @internal
 */
export function GridColumnManagerDialog({
	label,
	columns,
	order,
	onOrderChange,
	hidden,
	onHiddenChange,
	onSavePreset,
}: GridColumnManagerDialogProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Toolbar aria-label="Column management">
				<Button variant="plain" aria-haspopup="dialog" onClick={() => setOpen(true)}>
					<Icon icon={<SlidersHorizontal />} />
					{label}
				</Button>
			</Toolbar>

			<Dialog open={open} onOpenChange={setOpen}>
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
					<Button variant="plain" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}

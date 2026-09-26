'use client'

import type { ComponentProps, ReactNode } from 'react'
import { GridDirectionContext } from './context'
import { GridAutoSizeConfirmDialog } from './grid-auto-size-confirm-dialog'
import { GridColumnManager, type GridColumnManagerProps } from './grid-column-manager'
import { GridManagerDialog } from './grid-manager-dialog'
import { GridRowManagerRegionDialog } from './grid-region'
import type { GridRowManagerRegionResult } from './use-grid-row-manager'

/** Props for {@link GridDataDialogs}. @internal */
type GridDataDialogsProps = {
	/** The direction of the grid, read from its wrapper. The dialogs portal out of the grid. */
	direction: 'ltr' | 'rtl'
	/** The column manager and the state of its dialog, or `null` when the grid renders no manager. */
	columnManager: {
		open: boolean
		onOpenChange: (open: boolean) => void
		label: ReactNode
		manager: GridColumnManagerProps
	} | null
	/** The row manager of a client-grouped grid. */
	rowManager: GridRowManagerRegionResult
	/** The confirm step of a width action, or `null` when no seeded widths need it. */
	widthConfirm: ComponentProps<typeof GridAutoSizeConfirmDialog> | null
}

/**
 * The dialogs of {@link GridData}: the column manager, the row manager, and the
 * confirm step of "Auto-size all columns" and "Reset column widths".
 *
 * @internal
 */
export function GridDataDialogs({
	direction,
	columnManager,
	rowManager,
	widthConfirm,
}: GridDataDialogsProps) {
	return (
		<>
			{columnManager && (
				<GridDirectionContext value={direction}>
					<GridManagerDialog
						open={columnManager.open}
						onOpenChange={columnManager.onOpenChange}
						label={columnManager.label}
						dir={direction}
					>
						<GridColumnManager {...columnManager.manager} />
					</GridManagerDialog>
				</GridDirectionContext>
			)}

			<GridRowManagerRegionDialog region={rowManager} />

			{widthConfirm && <GridAutoSizeConfirmDialog {...widthConfirm} />}
		</>
	)
}

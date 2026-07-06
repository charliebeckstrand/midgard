'use client'

import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import type { PaletteColor } from '../../core/recipe'
import { GridRowManager } from './grid-row-manager'
import type { GridRowManagerGroup } from './use-grid-row-manager'

/** Props for {@link GridRowManagerDialog}. @internal */
type GridRowManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	groups: GridRowManagerGroup[]
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	onReorderGroups: (orderedKeys: (string | number)[]) => void
}

/**
 * Controlled {@link Dialog} hosting the {@link GridRowManager}. Its single entry
 * point is the grid's "Manage rows" group-header context-menu item; {@link Grid}
 * mounts it whenever client grouping and that menu are both live.
 *
 * @internal
 */
export function GridRowManagerDialog({
	open,
	onOpenChange,
	label,
	groups,
	onRecolor,
	onReorderGroups,
}: GridRowManagerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle>{label}</DialogTitle>
			<DialogBody>
				<GridRowManager groups={groups} onRecolor={onRecolor} onReorderGroups={onReorderGroups} />
			</DialogBody>
			<DialogFooter>
				<Button variant="plain" onClick={() => onOpenChange(false)}>
					Done
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

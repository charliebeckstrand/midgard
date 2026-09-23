'use client'

import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import { Text } from '../../components/text'

/** Props for {@link GridAutoSizeConfirmDialog}. @internal */
type GridAutoSizeConfirmDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Runs the auto-size-all fit; called on confirm, after the dialog closes. */
	onConfirm: () => void
}

/**
 * Confirmation for the "Auto-size all columns" action when saved column widths
 * exist. The fit replaces them (the fitted widths persist as the new sizing),
 * so the grid asks before discarding what the user deliberately set.
 * {@link GridData} mounts it in every resizable grid. The action opens it only
 * while a sizing preference is present. Without one the action runs unprompted
 * and establishes the preference.
 *
 * @internal
 */
export function GridAutoSizeConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: GridAutoSizeConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange} width="md">
			<DialogTitle>Auto-size all columns?</DialogTitle>
			<DialogBody>
				<Text>
					This fits every column to its content and replaces the column widths you saved. Your other
					layout preferences — order, visibility, and pinned columns — stay just as they are.
				</Text>
			</DialogBody>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
					Keep my widths
				</Button>
				<Button
					type="button"
					color="blue"
					onClick={() => {
						onOpenChange(false)

						onConfirm()
					}}
				>
					Auto-size columns
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

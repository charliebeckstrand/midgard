'use client'

import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'
import { Text } from '../../components/text'

/**
 * A header-menu width action that discards the saved widths: "Auto-size all
 * columns" (`auto-size`) or "Reset column widths" (`reset`). @internal
 */
export type GridWidthAction = 'auto-size' | 'reset'

/** The copy of {@link GridAutoSizeConfirmDialog}, per action. @internal */
const COPY: Record<GridWidthAction, { title: string; body: string; confirm: string }> = {
	'auto-size': {
		title: 'Auto-size all columns?',
		body: 'This fits every column to its content and replaces the column widths you saved.',
		confirm: 'Auto-size columns',
	},
	reset: {
		title: 'Reset column widths?',
		body: 'This discards the column widths you saved, and the grid sizes the columns to fit its width again.',
		confirm: 'Reset widths',
	},
}

/** Props for {@link GridAutoSizeConfirmDialog}. @internal */
type GridAutoSizeConfirmDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The action to confirm; it picks the copy. */
	action: GridWidthAction
	/** Runs the confirmed action; called on confirm, after the dialog closes. */
	onConfirm: (action: GridWidthAction) => void
}

/**
 * Confirmation for a width action that discards the saved column widths:
 * "Auto-size all columns" or "Reset column widths". The grid asks before it
 * discards what the user deliberately set. {@link GridData} mounts it in every
 * resizable grid. An action opens it only while a sizing preference is present.
 * Without one the action runs unprompted.
 *
 * @internal
 */
export function GridAutoSizeConfirmDialog({
	open,
	onOpenChange,
	action,
	onConfirm,
}: GridAutoSizeConfirmDialogProps) {
	const copy = COPY[action]

	return (
		<Dialog open={open} onOpenChange={onOpenChange} width="md">
			<DialogTitle>{copy.title}</DialogTitle>
			<DialogBody>
				<Text>
					{copy.body} Your other layout preferences — order, visibility, and pinned columns — stay
					just as they are.
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

						onConfirm(action)
					}}
				>
					{copy.confirm}
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

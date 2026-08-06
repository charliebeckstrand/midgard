'use client'

import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../components/dialog'

/** Props for {@link GridManagerDialog}. @internal */
type GridManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	/** The manager the dialog hosts — the column editor or the row-group editor. */
	children: ReactNode
}

/**
 * Controlled {@link Dialog} shell shared by the grid's manager surfaces: a title,
 * the manager itself, and a Done button that closes. Each call site owns when it
 * mounts.
 *
 * The shell takes its manager as `children` rather than forwarding each
 * manager's props, so a new prop on either editor reaches it from the call site
 * without passing through here.
 *
 * @internal
 */
export function GridManagerDialog({ open, onOpenChange, label, children }: GridManagerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTitle>{label}</DialogTitle>
			<DialogBody>{children}</DialogBody>
			<DialogFooter>
				<Button type="button" variant="plain" onClick={() => onOpenChange(false)}>
					Done
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

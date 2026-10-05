'use client'

import { type ReactNode, useRef } from 'react'
import { Button } from '../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogPanel, DialogTitle } from '../../components/dialog'

/** Props for {@link GridManagerDialog}. @internal */
type GridManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	/** The manager the dialog hosts — the column editor or the row-group editor. */
	children: ReactNode
	/**
	 * Whether focus opens on Done. A dialog that opens from a menu item names
	 * its target, because the item that held focus is gone by then. Otherwise
	 * the dialog takes its first control.
	 */
	focusDone?: boolean
}

/**
 * Controlled {@link Dialog} shell shared by the grid's manager surfaces: a title,
 * the manager itself, and a Done button that closes. Each call site owns when it
 * mounts.
 *
 * The shell takes its manager as `children` rather than forwarding each
 * manager's props. A new prop on either editor therefore reaches it from the
 * call site, without passing through here.
 *
 * @internal
 */
export function GridManagerDialog({
	open,
	onOpenChange,
	label,
	children,
	focusDone = false,
}: GridManagerDialogProps) {
	const doneRef = useRef<HTMLButtonElement>(null)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel initialFocus={focusDone ? doneRef : undefined}>
				<DialogTitle>{label}</DialogTitle>
				<DialogBody>{children}</DialogBody>
				<DialogFooter>
					<Button ref={doneRef} type="button" variant="plain" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogPanel>
		</Dialog>
	)
}

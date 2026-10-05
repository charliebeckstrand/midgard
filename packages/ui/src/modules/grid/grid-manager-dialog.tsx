'use client'

import { type ReactNode, useRef } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogFooter,
	DialogPanel,
	DialogTitle,
} from '../../components/dialog'

/** Props for {@link GridManagerDialog}. @internal */
type GridManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	label: ReactNode
	/** The manager the dialog hosts — the column editor or the row-group editor. */
	children: ReactNode
	/**
	 * Whether focus opens on Close. A dialog that opens from a menu item names
	 * its target, because the item that held focus is gone by then. Otherwise
	 * the dialog takes its first control.
	 */
	focusClose?: boolean
}

/**
 * Controlled {@link Dialog} shell shared by the grid's manager surfaces: a title,
 * the manager itself, and a Close button. Each call site owns when it
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
	focusClose = false,
}: GridManagerDialogProps) {
	const closeRef = useRef<HTMLButtonElement>(null)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel initialFocus={focusClose ? closeRef : undefined}>
				<DialogTitle>{label}</DialogTitle>
				<DialogBody>{children}</DialogBody>
				<DialogFooter>
					<DialogClose>
						<Button ref={closeRef} type="button" variant="soft">
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogPanel>
		</Dialog>
	)
}

'use client'

import type { ButtonVariants } from '../button'
import { Button } from '../button'
import { Dialog } from './dialog'
import { DialogActions, DialogBody, DialogDescription, DialogTitle } from './slots'
import type { DialogPanelVariants } from './variants'

export type ConfirmDialogProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onClose: () => void
	onConfirm: () => void
	title?: React.ReactNode
	description?: React.ReactNode
	children?: React.ReactNode
	confirmLabel?: string
	cancelLabel?: string
	color?: NonNullable<ButtonVariants['color']>
	className?: string
}

export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title = 'Are you sure?',
	description,
	children,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	color = 'red',
	size,
	className,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onClose={onClose} size={size} className={className}>
			<DialogTitle>{title}</DialogTitle>
			{description && <DialogDescription>{description}</DialogDescription>}
			{children && <DialogBody>{children}</DialogBody>}
			<DialogActions>
				<Button variant="plain" onClick={onClose}>
					{cancelLabel}
				</Button>
				<Button color={color} onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

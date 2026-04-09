'use client'

import type { ButtonVariants } from '../button'
import { Button } from '../button'
import { Dialog } from './dialog'
import { DialogActions, DialogBody, DialogDescription, DialogTitle } from './slots'
import type { DialogPanelVariants } from './variants'

type ConfirmDialogAction = {
	label?: string
	color?: NonNullable<ButtonVariants['color']>
	disabled?: boolean
}

export type ConfirmDialogProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onClose: () => void
	onConfirm: () => void
	title?: React.ReactNode
	description?: React.ReactNode
	children?: React.ReactNode
	confirm?: ConfirmDialogAction
	cancel?: ConfirmDialogAction
	className?: string
}

export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title = 'Are you sure?',
	description,
	children,
	confirm,
	cancel,
	size,
	className,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onClose={onClose} size={size} className={className}>
			{title && <DialogTitle>{title}</DialogTitle>}
			{description && <DialogDescription>{description}</DialogDescription>}
			{children && <DialogBody>{children}</DialogBody>}
			<DialogActions>
				<Button variant="plain" color={cancel?.color} disabled={cancel?.disabled} onClick={onClose}>
					{cancel?.label ?? 'Cancel'}
				</Button>
				<Button color={confirm?.color} disabled={confirm?.disabled} onClick={onConfirm}>
					{confirm?.label ?? 'Confirm'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

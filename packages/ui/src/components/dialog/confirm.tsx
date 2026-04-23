'use client'

import type { ReactNode } from 'react'
import type { ButtonVariants } from '../button'
import { Button } from '../button'
import { Dialog } from './dialog'
import { DialogActions, DialogDescription, DialogTitle } from './slots'
import type { DialogPanelVariants } from './variants'

type ConfirmDialogAction = {
	label?: string
	color?: NonNullable<ButtonVariants['color']>
	disabled?: boolean
}

export type ConfirmDialogProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
	title?: ReactNode
	description?: ReactNode
	children?: ReactNode
	confirm?: ConfirmDialogAction
	cancel?: ConfirmDialogAction
	className?: string
}

export function ConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	title = 'Are you sure?',
	description,
	children,
	confirm,
	cancel,
	size,
	className,
}: ConfirmDialogProps) {
	const close = () => onOpenChange(false)

	return (
		<Dialog open={open} onOpenChange={onOpenChange} size={size} className={className}>
			{title && <DialogTitle>{title}</DialogTitle>}
			{description && <DialogDescription>{description}</DialogDescription>}
			{children}
			<DialogActions>
				<Button variant="plain" color={cancel?.color} disabled={cancel?.disabled} onClick={close}>
					{cancel?.label ?? 'Cancel'}
				</Button>
				<Button color={confirm?.color} disabled={confirm?.disabled} onClick={onConfirm}>
					{confirm?.label ?? 'Confirm'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

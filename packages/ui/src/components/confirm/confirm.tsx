'use client'

import type { ReactNode } from 'react'
import { Button, type ButtonVariants } from '../button'
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	type DialogPanelVariants,
	DialogTitle,
} from '../dialog'

type ConfirmAction = {
	label?: string
	color?: NonNullable<ButtonVariants['color']>
	disabled?: boolean
}

export type ConfirmProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
	title?: ReactNode
	description?: ReactNode
	children?: ReactNode
	confirm?: ConfirmAction
	cancel?: ConfirmAction
	className?: string
}

export function Confirm({
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
}: ConfirmProps) {
	const close = () => onOpenChange(false)

	return (
		<Dialog open={open} onOpenChange={onOpenChange} size={size} className={className}>
			{(title || description) && (
				<DialogHeader>
					{title && <DialogTitle>{title}</DialogTitle>}
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
			)}
			{children}
			<DialogFooter>
				<Button variant="plain" color={cancel?.color} disabled={cancel?.disabled} onClick={close}>
					{cancel?.label ?? 'Cancel'}
				</Button>
				<Button color={confirm?.color} disabled={confirm?.disabled} onClick={onConfirm}>
					{confirm?.label ?? 'Confirm'}
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

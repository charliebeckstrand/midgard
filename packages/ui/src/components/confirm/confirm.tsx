'use client'

import { type ReactNode, useCallback, useEffect } from 'react'
import { usePanelA11y } from '../../primitives/panel'
import { Button, type ButtonVariants } from '../button'
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	type DialogPanelVariants,
	DialogTitle,
} from '../dialog'

/**
 * Registers `children` as the alertdialog's description when no explicit
 * `description` slot renders — `role="alertdialog"` requires its message to
 * be referenced by `aria-describedby`, and children are the message in the
 * title + children form.
 */
function ConfirmBody({ children }: { children: ReactNode }) {
	const { descriptionId, registerDescription } = usePanelA11y()

	useEffect(() => registerDescription?.(), [registerDescription])

	return (
		<div id={descriptionId} data-slot="confirm-body">
			{children}
		</div>
	)
}

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

/** Confirmation dialog built on Dialog with `role="alertdialog"` — pairs a cancel and confirm action whose labels, colors, and disabled state are configurable. */
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
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			data-slot="confirm"
			role="alertdialog"
			size={size}
			className={className}
		>
			{(title || description) && (
				<DialogHeader>
					{title && <DialogTitle>{title}</DialogTitle>}
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
			)}
			{children !== undefined &&
				(description === undefined ? <ConfirmBody>{children}</ConfirmBody> : children)}
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

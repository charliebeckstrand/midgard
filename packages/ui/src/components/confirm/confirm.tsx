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
 * Description fallback registering `children` as the alertdialog's
 * `aria-describedby` target when no explicit `description` slot renders.
 *
 * @remarks
 * `role="alertdialog"` requires its message referenced by `aria-describedby`;
 * in the title-plus-children form the children are that message, so this wrapper
 * stamps the panel's `descriptionId` and registers with the a11y context. Skipped
 * when a `description` is supplied, since {@link DialogDescription} already registers.
 * @see {@link usePanelA11y}
 * @internal
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

/**
 * Per-button overrides for the confirm and cancel actions.
 * @internal
 */
type ConfirmAction = {
	/**
	 * Button text.
	 * @defaultValue 'Confirm' for the confirm action, 'Cancel' for the cancel action
	 */
	label?: string
	/** Button color, forwarded to {@link Button}. */
	color?: NonNullable<ButtonVariants['color']>
	/** Disables the button. */
	disabled?: boolean
}

/** Props for {@link Confirm}: open-state control, message content, the two configurable actions, and dialog `size`. */
export type ConfirmProps = Pick<DialogPanelVariants, 'size'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Fires when the confirm action is pressed; does not close the dialog (drive `open` from your handler). */
	onConfirm: () => void
	/**
	 * Heading text, rendered as the {@link DialogTitle}.
	 * @defaultValue 'Are you sure?'
	 */
	title?: ReactNode
	/** Supporting copy, rendered as the {@link DialogDescription} and used as the `aria-describedby` target. */
	description?: ReactNode
	/**
	 * Message body for the title-plus-children form. Registers as the
	 * `aria-describedby` target only when `description` is omitted.
	 * @see {@link ConfirmBody}
	 */
	children?: ReactNode
	/** Overrides for the confirm (primary) action. */
	confirm?: ConfirmAction
	/** Overrides for the cancel (plain) action. */
	cancel?: ConfirmAction
	className?: string
}

/**
 * Confirmation dialog built on {@link Dialog} with `role="alertdialog"`. Pairs a cancel
 * and a confirm action whose labels, colors, and disabled state are configurable.
 *
 * @remarks
 * Controlled-only: `open`/`onOpenChange` are required, and `onConfirm` leaves the dialog
 * open so the caller decides when to dismiss. The accessible message comes from either
 * `description` (a registered {@link DialogDescription}) or, in the title-plus-children
 * form, the `children` wrapped in {@link ConfirmBody}; `description` takes precedence.
 * @see {@link Dialog}
 */
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

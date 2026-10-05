'use client'

import { type ReactNode, useCallback, useEffect } from 'react'
import { cn } from '../../core'
import { usePanelA11y } from '../../primitives/panel'
import { k as panel } from '../../recipes/kata/panel'
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
 * Scroll region of the `children`. With `describes`, it is also the
 * alertdialog's `aria-describedby` target.
 *
 * @remarks
 * `role="alertdialog"` requires its message referenced by `aria-describedby`.
 * In the title-plus-children form the children are that message, so the region
 * stamps the panel's `descriptionId` and registers with the a11y context. When a
 * `description` is supplied, `describes` is off, since {@link DialogDescription}
 * already registers.
 *
 * From `sm` up, the dialog panel has a height cap and no overflow of its own.
 * The region is a direct flex child of the panel, so `min-h-0` lets it shrink
 * to the cap, and it scrolls. The header stays outside the region, as the panel
 * layout recipe sets, so the header and the actions stay in view.
 *
 * The region has two layouts. With `describes`, it is a plain block, so inline
 * children flow as text. A `DialogBody` child then does not shrink, and the
 * region scrolls in its place. Without `describes`, the children are slots of
 * the panel. The region then keeps the slot rhythm of the panel, so a
 * `DialogBody` child shrinks and scrolls on its own.
 * @see {@link usePanelA11y}
 * @internal
 */
function ConfirmBody({ describes, children }: { describes: boolean; children: ReactNode }) {
	const { descriptionId, registerDescription } = usePanelA11y()

	useEffect(
		() => (describes ? registerDescription?.() : undefined),
		[describes, registerDescription],
	)

	return (
		<div
			id={describes ? descriptionId : undefined}
			data-slot="confirm-body"
			data-scroll-region
			className={cn(!describes && panel.base, 'min-h-0 overflow-y-auto')}
		>
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
	/**
	 * Puts the confirm button in its `loading` state while the action runs.
	 *
	 * @remarks
	 * Use it in place of `disabled` for an action in progress. A disabled button
	 * drops the focus that it has. A pending button stays enabled and keeps its
	 * focus. It is `aria-disabled`, and it cancels each activation, so `onConfirm`
	 * does not fire. The `cancel` action does not take this field.
	 * @defaultValue false
	 * @see {@link Button}
	 */
	pending?: boolean
}

/** Props for {@link Confirm}: open-state control, message content, the two configurable actions, and dialog `width`. */
export type ConfirmProps = Pick<DialogPanelVariants, 'width'> & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Fires when the confirm action is pressed; does not close the dialog (drive `open` from your handler). */
	onConfirm: () => void
	/**
	 * Fires when the Cancel button is pressed, and only then.
	 *
	 * `onOpenChange(false)` reports every dismissal: the button, the backdrop,
	 * Escape, and the close affordance. A caller that has to tell a refusal from
	 * a walk-away reads it here instead. It runs before the dialog closes, and
	 * the close still runs.
	 */
	onCancel?: () => void
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
	cancel?: Omit<ConfirmAction, 'pending'>
	className?: string
}

/**
 * Confirmation dialog built on {@link Dialog} with `role="alertdialog"`. Pairs a cancel
 * and a confirm action whose labels, colors, and disabled state are configurable. The
 * confirm action also takes a pending state, which keeps its focus.
 *
 * @remarks
 * Controlled-only: `open`/`onOpenChange` are required, and `onConfirm` leaves the dialog
 * open so the caller decides when to dismiss. `onCancel` fires for the Cancel button
 * alone, where `onOpenChange(false)` reports every dismissal. The accessible message comes from either
 * `description` (a registered {@link DialogDescription}) or, in the title-plus-children
 * form, the `children` wrapped in {@link ConfirmBody}; `description` takes precedence.
 * The children sit in a scroll region between the header and the actions. When they are
 * long, they scroll, and the header and the actions stay in view.
 * @see {@link Dialog}
 */
export function Confirm({
	open,
	onOpenChange,
	onConfirm,
	onCancel,
	title = 'Are you sure?',
	description,
	children,
	confirm,
	cancel,
	width,
	className,
}: ConfirmProps) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	// The button's own path: report the refusal, then close as any dismissal does.
	const handleCancel = useCallback(() => {
		onCancel?.()

		close()
	}, [onCancel, close])

	// The button gives its click event to `onClick`, and `onConfirm` takes no argument.
	// Call it with none.
	const handleConfirm = useCallback(() => onConfirm(), [onConfirm])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			data-slot="confirm"
			role="alertdialog"
			width={width}
			className={className}
		>
			{(title || description) && (
				<DialogHeader>
					{title && <DialogTitle>{title}</DialogTitle>}
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
			)}
			{children !== undefined && (
				<ConfirmBody describes={description === undefined}>{children}</ConfirmBody>
			)}
			<DialogFooter>
				<Button
					type="button"
					variant="plain"
					color={cancel?.color}
					disabled={cancel?.disabled}
					onClick={handleCancel}
				>
					{cancel?.label ?? 'Cancel'}
				</Button>
				<Button
					type="button"
					color={confirm?.color}
					disabled={confirm?.disabled}
					loading={confirm?.pending}
					onClick={handleConfirm}
				>
					{confirm?.label ?? 'Confirm'}
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

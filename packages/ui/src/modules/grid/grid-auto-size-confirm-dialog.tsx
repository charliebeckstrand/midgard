'use client'

import { Confirm } from '../../components/confirm'
import type { MessageDescriptor } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { gridMessages } from './engine/grid-messages'

/**
 * A header-menu width action that discards the saved widths: "Auto-size all
 * columns" (`auto-size`) or "Reset column widths" (`reset`). @internal
 */
export type GridWidthAction = 'auto-size' | 'reset'

/** The messages of {@link GridAutoSizeConfirmDialog}, per action. @internal */
const COPY: Record<
	GridWidthAction,
	{ title: MessageDescriptor; body: MessageDescriptor; confirm: MessageDescriptor }
> = {
	'auto-size': {
		title: gridMessages.autoSizeTitle,
		body: gridMessages.autoSizeBody,
		confirm: gridMessages.autoSizeConfirm,
	},
	reset: {
		title: gridMessages.resetTitle,
		body: gridMessages.resetBody,
		confirm: gridMessages.resetConfirm,
	},
}

/** Props for {@link GridAutoSizeConfirmDialog}. @internal */
type GridAutoSizeConfirmDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The action to confirm; it picks the copy. */
	action: GridWidthAction
	/** Runs the confirmed action; called on confirm, after the dialog closes. */
	onConfirm: (action: GridWidthAction) => void
}

/**
 * Confirmation for a width action that discards the saved column widths:
 * "Auto-size all columns" or "Reset column widths". The grid asks before it
 * discards what the user deliberately set. {@link GridData} mounts it in every
 * resizable grid. An action opens it only while a sizing preference is present.
 * Without one the action runs unprompted.
 *
 * @internal
 */
export function GridAutoSizeConfirmDialog({
	open,
	onOpenChange,
	action,
	onConfirm,
}: GridAutoSizeConfirmDialogProps) {
	const copy = COPY[action]

	const intl = useIntl()

	return (
		<Confirm
			open={open}
			onOpenChange={onOpenChange}
			width="md"
			title={intl.formatMessage(copy.title)}
			description={intl.formatMessage(copy.body)}
			cancel={{ label: intl.formatMessage(gridMessages.keepWidths) }}
			confirm={{ label: intl.formatMessage(copy.confirm), color: 'blue' }}
			onConfirm={() => {
				onOpenChange(false)

				onConfirm(action)
			}}
		/>
	)
}

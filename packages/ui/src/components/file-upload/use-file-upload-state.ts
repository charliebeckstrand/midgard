'use client'

import { createElement, Fragment, type ReactNode, useCallback, useState } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useControlTypedVerdict } from '../control/use-control-typed-verdict'
import type { FileUploadHiddenInputProps } from './file-upload-hidden-input'
import { describeSelection, type FileRejection } from './file-upload-utilities'
import type { FileUploadSharedProps } from './types'
import { useFileUploadHandlers } from './use-file-upload-handlers'

/**
 * Hook output plus the derived selection flags every variant renderer shares.
 *
 * @internal
 */
export type FileUploadRenderState = ReturnType<typeof useFileUploadHandlers> & {
	control: ReturnType<typeof useControl>
	/** The `disabled` prop, else the disabled state of the enclosing Control. */
	disabled: boolean | undefined
	/**
	 * The read-only state of the enclosing Control, or of a locked scope, such as
	 * a `Form` while a submit runs. Each trigger of the component spreads
	 * `lockedProps` while it holds, so it keeps the focus and opens no picker.
	 */
	readOnly: boolean | undefined
	/** The error state of the enclosing Control, or an error on the bound Form field. */
	invalid: true | undefined
	/** The `aria-describedby` of each trigger: the ids of the Control, and the id of the refusal Message outside a Control. */
	describedBy: string | undefined
	/** The error Message of the last refusal, or `null`. Render it after the component. */
	refusal: ReactNode
	hasFiles: boolean
	/** Forces the selection tooltip open for the "x files selected" summary,
	 * whose collapsed count hides the names. A single name needs it only when
	 * clipped. The `drop` variant detects the clip (`useTruncation`), and the
	 * `input` variant relies on this flag alone. */
	showTooltip: boolean
	/**
	 * The props of the hidden input, less the accessible name that each
	 * component draws from its own trigger, and the focus forward to that trigger.
	 */
	hiddenInput: Omit<FileUploadHiddenInputProps, 'ariaLabel' | 'forwardFocus'>
}

/**
 * Separates the keys that {@link useFileUploadState} reads from the other
 * props. A component spreads the other props on its root element.
 *
 * @internal
 */
export function splitProps<P extends FileUploadSharedProps>({
	name,
	value,
	defaultValue,
	onValueChange,
	accept,
	multiple,
	disabled,
	maxSize,
	maxCount,
	onAccept,
	onReject,
	invalidMessage,
	onDragOverChange,
	...rest
}: P) {
	const shared: FileUploadSharedProps = {
		name,
		value,
		defaultValue,
		onValueChange,
		accept,
		multiple,
		disabled,
		maxSize,
		maxCount,
		onAccept,
		onReject,
		invalidMessage,
		onDragOverChange,
	}

	return { shared, rest }
}

/**
 * The state every file-upload component shares: the handlers, the props of
 * the hidden input, the resolved Control context, the merged `invalid` flag,
 * and the derived selection flags.
 *
 * @remarks
 * The three components differ in what they draw, not in how they pick. This is
 * the "how", held once, which is what made three explicit components cheaper
 * than the `variant` discriminant they replace.
 *
 * @internal
 */
export function useFileUploadState(props: FileUploadSharedProps): FileUploadRenderState {
	const { multiple, maxCount, invalidMessage, ...options } = props

	const intl = useIntl()

	// Mirrors Control/Field id + invalid + required + error-message wiring onto
	// the hidden `<input type="file">`, the real control in each component. The
	// visible `<Input>` of FileUploadInput opts out of this context.
	const control = useControl()

	// An explicit `disabled` wins over the Control. The family takes no
	// `readOnly` prop: it takes the read-only state of the Control, and a locked
	// scope makes it read-only too. The hidden input takes the id of the
	// Control, so the name registers that id, and a FormErrorSummary links the
	// field to it.
	const { disabled, readOnly } = useControlProps({ disabled: props.disabled, name: props.name })

	// The files that the last pick or drop refused, until the next pick, drop,
	// clear, or reset. The default text gives them back with their reasons.
	const [refused, setRefused] = useState<readonly FileRejection[]>([])

	// Counts the batches that refuse files. An alert speaks when it comes into
	// the page, and a Message with the same text as the last one changes no
	// node. Each refusing batch thus mounts a new Message (WCAG 4.1.3).
	const [refusals, setRefusals] = useState(0)

	// A single-file component takes one file at most. The picker holds to that,
	// but a drop can carry many.
	const limit = multiple ? maxCount : Math.min(maxCount ?? 1, 1)

	// The limits that the Message gives with a refusal.
	const limits = { accept: props.accept, maxSize: props.maxSize, maxCount: limit }

	// Only an absent `invalidMessage` takes the default. `null` and `false`
	// suppress the Message.
	const messageShown = invalidMessage === undefined || Boolean(invalidMessage)

	const verdict = useControlTypedVerdict({
		describedBy: control?.describedBy,
		message:
			invalidMessage === undefined
				? describeSelection(intl, { accepted: [], rejected: refused }, limits)
				: invalidMessage,
	})

	const setInvalid = verdict.setInvalid

	const onRefuse = useCallback(
		(rejected: readonly FileRejection[]) => {
			setRefused(rejected)

			setInvalid(rejected.length > 0)

			if (rejected.length > 0) setRefusals((count) => count + 1)
		},
		[setInvalid],
	)

	const handlers = useFileUploadHandlers({
		...options,
		disabled,
		readOnly,
		// The error Message is an alert, and a caller of `onReject` with no
		// Message shows its own. Each speaks the refusal, so the live region
		// does not also speak it.
		announceRefused: !messageShown && props.onReject === undefined,
		onRefuse,
		maxCount: limit,
	})

	const invalid = control?.severity === 'error' || handlers.invalid || undefined

	const hasFiles = handlers.files.length > 0

	return {
		...handlers,
		control,
		disabled,
		readOnly,
		invalid,
		describedBy: verdict.describedBy,
		refusal: createElement(Fragment, { key: refusals }, verdict.message),
		hasFiles,
		showTooltip: Boolean(multiple && handlers.files.length > 1),
		hiddenInput: {
			control,
			describedBy: verdict.describedBy,
			inputRef: handlers.inputRef,
			accept: props.accept,
			multiple,
			disabled,
			readOnly,
			invalid,
			filesEmpty: !hasFiles,
			onChange: handlers.handleChange,
		},
	}
}

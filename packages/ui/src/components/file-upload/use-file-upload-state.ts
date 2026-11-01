'use client'

import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import type { FileUploadHiddenInputProps } from './file-upload-hidden-input'
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
	hasFiles: boolean
	/** Forces the selection tooltip open for the "x files selected" summary,
	 * whose collapsed count hides the names. A single name needs it only when
	 * clipped. The `drop` variant detects the clip (`useTruncation`), and the
	 * `input` variant relies on this flag alone. */
	showTooltip: boolean
	/**
	 * The props of the hidden input, less the accessible name that each
	 * component draws from its own trigger.
	 */
	hiddenInput: Omit<FileUploadHiddenInputProps, 'ariaLabel'>
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
	const { multiple, maxCount, ...options } = props

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

	const handlers = useFileUploadHandlers({
		...options,
		disabled,
		readOnly,
		// A single-file component takes one file at most. The picker holds to
		// that, but a drop can carry many.
		maxCount: multiple ? maxCount : Math.min(maxCount ?? 1, 1),
	})

	const invalid = control?.severity === 'error' || handlers.invalid || undefined

	const hasFiles = handlers.files.length > 0

	return {
		...handlers,
		control,
		disabled,
		readOnly,
		invalid,
		hasFiles,
		showTooltip: Boolean(multiple && handlers.files.length > 1),
		hiddenInput: {
			control,
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

'use client'

import type { ChangeEventHandler, Ref } from 'react'
import { invalidAttrs } from '../../core/invalid-attrs'
import { lockedProps } from '../button/button-constants'
import type { ControlContextValue } from '../control/context'
import { useControlFallbackLabel } from '../control/use-control-fallback-label'

/**
 * Props for {@link FileUploadHiddenInput}.
 *
 * @internal
 */
export type FileUploadHiddenInputProps = {
	ariaLabel: string
	control: ControlContextValue | undefined
	inputRef: Ref<HTMLInputElement>
	accept?: string
	multiple?: boolean
	disabled?: boolean
	/** Cancels the click that opens the picker, as {@link lockedProps} do. A screen reader can click the input. */
	readOnly?: boolean
	invalid?: boolean
	filesEmpty: boolean
	onChange: ChangeEventHandler<HTMLInputElement>
	/**
	 * Moves the focus to the visible trigger of the component. The input calls
	 * it when it takes the focus, because nothing on screen shows the input.
	 */
	forwardFocus: () => void
}

/**
 * The visually-hidden `<input type="file">` is the real control in every
 * variant. Screen readers reach it even at `tabIndex -1`. It takes the Control
 * id, so a `<Label>` in the enclosing `<Field>` points at it and names it
 * from the first render. A registered Label also names it through
 * `aria-labelledby`. With no Label, each variant
 * supplies a name drawn from its visible trigger.
 *
 * Focus that reaches the input, such as the focus that a `Form` gives the
 * first invalid field or a link of a `FormErrorSummary`, moves on to the
 * visible trigger (WCAG 2.4.7).
 *
 * @internal
 */
export function FileUploadHiddenInput({
	ariaLabel,
	control,
	inputRef,
	accept,
	multiple,
	disabled,
	readOnly,
	invalid,
	filesEmpty,
	onChange,
	forwardFocus,
}: FileUploadHiddenInputProps) {
	const fallbackLabel = useControlFallbackLabel(ariaLabel)

	return (
		<input
			ref={inputRef}
			type="file"
			id={control?.id}
			// `aria-label` wins over `<label for>`, so it is written only when no
			// Field Label can name the control, from the first render on.
			aria-labelledby={control?.labelledBy}
			aria-label={fallbackLabel}
			aria-describedby={control?.describedBy}
			accept={accept}
			multiple={multiple}
			disabled={disabled}
			// handleChange clears the input value, emptying the FileList; native
			// `required` validation then fails despite a valid pick. Tracks the
			// selection separately and drops the constraint once files are held.
			required={control?.required && filesEmpty}
			onChange={onChange}
			onFocus={forwardFocus}
			className="sr-only"
			tabIndex={-1}
			{...invalidAttrs(invalid)}
			{...(readOnly && lockedProps)}
		/>
	)
}

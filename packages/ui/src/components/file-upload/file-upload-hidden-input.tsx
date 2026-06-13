'use client'

import type { ChangeEventHandler, RefObject } from 'react'
import { invalidAttrs } from '../../core'
import type { ControlContextValue } from '../control/context'

type FileUploadHiddenInputProps = {
	ariaLabel: string
	control: ControlContextValue | undefined
	inputRef: RefObject<HTMLInputElement | null>
	accept?: string
	multiple?: boolean
	disabled?: boolean
	filesEmpty: boolean
	onChange: ChangeEventHandler<HTMLInputElement>
}

/**
 * The visually-hidden `<input type="file">` is the real control in every
 * variant; screen readers reach it even at `tabIndex -1`, so each variant
 * supplies an accessible name drawn from its visible trigger.
 */
export function FileUploadHiddenInput({
	ariaLabel,
	control,
	inputRef,
	accept,
	multiple,
	disabled,
	filesEmpty,
	onChange,
}: FileUploadHiddenInputProps) {
	return (
		<input
			ref={inputRef}
			type="file"
			aria-label={ariaLabel}
			aria-describedby={control?.describedBy}
			accept={accept}
			multiple={multiple}
			disabled={disabled}
			// handleChange clears the input value, emptying the FileList; native
			// `required` validation then fails despite a valid pick. Tracks the
			// selection separately and drops the constraint once files are held.
			required={control?.required && filesEmpty}
			onChange={onChange}
			className="sr-only"
			tabIndex={-1}
			{...invalidAttrs(control?.invalid)}
		/>
	)
}

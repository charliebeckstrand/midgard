'use client'

import { type ComponentProps, useId, useRef } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { invalidAttrs } from '../../core/invalid-attrs'
import { useHeadlessSlots } from '../../primitives/headless/use-headless-slots'
import { Upload } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import type { scale as controlScale } from '../../recipes/kata/control'
import { k } from '../../recipes/kata/file-upload'
import { Button } from '../button'
import { lockedProps } from '../button/button-constants'
import { useControlVariant } from '../control/use-control-variant'
import { Icon } from '../icon'
import { InputClearButton } from '../input/input-clear-button'
import { InputFrame } from '../input/input-frame'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { fileUploadMessages } from './file-upload-messages'
import { formatFileNames, selectionSummary } from './file-upload-utilities'
import type { FileUploadSharedProps } from './types'
import { splitProps, useFileUploadState } from './use-file-upload-state'

/**
 * Props for {@link FileUploadInput}: the shared accept and limit rules, plus the field's size and placeholder.
 * The root `<div>` takes the rest. The field takes no children, and `defaultValue` holds files.
 */
export type FileUploadInputProps = Omit<ComponentProps<'div'>, 'defaultValue' | 'children'> &
	FileUploadSharedProps & {
		/**
		 * The density step of the field. Omit it to take the step of the nearest
		 * density scope. A step makes the field a density scope.
		 */
		size?: ScaleStep<typeof controlScale>
		/**
		 * Placeholder when empty; also the hidden input's accessible name.
		 *
		 * @defaultValue `'Select a file'`, in the language of the reader.
		 */
		placeholder?: string
	}

/**
 * File picker rendered as a field-shaped button over a hidden
 * `<input type="file">`. Activating the button opens the picker, and a
 * selection shows the file name with a clear button in the suffix. The clear
 * button gives focus back to the display button. Under a `HeadlessProvider`,
 * the field has no frame and no Browse button. The clear button stays, as a
 * bare button after the display button.
 *
 * @remarks
 * Shares every internal with {@link FileUploadDrop}: the hidden input is the
 * real control, and selection, limits, and announcements run through
 * {@link useFileUploadHandlers}. It takes no children: the display button
 * shows the selection or the placeholder.
 *
 * The display button is not the control. It does not take the id or `required`
 * of the enclosing `<Control>` / `<Field>`; those go to the hidden input only.
 * It takes the `aria-describedby` of the Field, so the Description and the
 * error Message reach the focus. The button also shows the disabled state, the
 * variant, and the error ring of the enclosing Field. Its name is the Field
 * Label and then the selection summary or the placeholder, through
 * `aria-labelledby`. With no Label, its content gives the name.
 *
 * @see {@link FileUploadDrop} · {@link FileUploadButton}
 */
export function FileUploadInput(allProps: FileUploadInputProps) {
	const { shared, rest } = splitProps(allProps)

	const intl = useIntl()

	const { className, size, placeholder: placeholderProp, ...props } = rest

	const placeholder = placeholderProp ?? intl.formatMessage(fileUploadMessages.selectFile)

	const state = useFileUploadState(shared)

	const { multiple } = shared
	const {
		control,
		describedBy,
		disabled,
		readOnly,
		invalid,
		files,
		hasFiles,
		showTooltip,
		openPicker,
		clearFiles,
	} = state

	// A read-only field keeps the focus on each of its buttons, and they open
	// no picker and clear nothing.
	const inert = readOnly && lockedProps

	const label = selectionSummary(intl, files, multiple)

	const valueId = useId()

	const fieldRef = useRef<HTMLButtonElement>(null)

	const focusField = () => fieldRef.current?.focus()

	const handleClear = () => {
		clearFiles()

		// Moves focus to the field once the clear button unmounts (WCAG 2.4.3).
		focusField()
	}

	// A pick swaps the Browse button for the clear button. Focus moves to the
	// field first, so that the picker gives it back to a control that stays.
	const handleBrowse = () => {
		focusField()

		openPicker()
	}

	// The suffix always holds the clear or the browse button, so the frame is affixed.
	const slots = useHeadlessSlots(k.input, { variant: useControlVariant(), affixed: true })

	// The display button is not the control, so it takes no Field id or
	// `required`. It shows the state of the Field through its own props. The
	// description goes on only when it exists, because the tooltip yields its
	// own description to a key that the button writes, also an empty one.
	const field = (
		<Tooltip disabled={!showTooltip}>
			<TooltipTrigger>
				<button
					ref={fieldRef}
					type="button"
					data-slot="file-upload-field"
					aria-labelledby={control?.labelledBy ? `${control.labelledBy} ${valueId}` : undefined}
					{...(describedBy && { 'aria-describedby': describedBy })}
					disabled={disabled}
					{...invalidAttrs(invalid)}
					className={slots.field}
					onClick={openPicker}
					{...inert}
				>
					<span id={valueId} className={cn(k.value, !label && k.placeholder)}>
						{label ?? placeholder}
					</span>
				</button>
			</TooltipTrigger>
			<TooltipContent>{formatFileNames(files)}</TooltipContent>
		</Tooltip>
	)

	return (
		<>
			<div data-slot="file-upload" {...props} className={cn('relative', className)}>
				<FileUploadHiddenInput
					{...state.hiddenInput}
					ariaLabel={placeholder}
					forwardFocus={focusField}
				/>
				<InputFrame
					input={field}
					prefix={undefined}
					suffix={
						hasFiles ? (
							<InputClearButton
								label={intl.formatMessage(fileUploadMessages.clear, { count: files.length })}
								disabled={disabled}
								locked={readOnly}
								onClick={handleClear}
							/>
						) : (
							<Button
								type="button"
								variant="bare"
								className="pointer-events-auto"
								aria-label={intl.formatMessage(fileUploadMessages.browse)}
								disabled={disabled}
								onClick={handleBrowse}
								{...inert}
							>
								<Icon icon={<Upload />} />
							</Button>
						)
					}
					slots={slots}
					density={size}
				/>
			</div>
			{state.refusal}
		</>
	)
}

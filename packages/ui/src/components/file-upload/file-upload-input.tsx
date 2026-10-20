'use client'

import { Upload } from 'lucide-react'
import { useId, useRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { useGlass } from '../../providers/glass/context'
import { useHeadless } from '../../providers/headless/context'
import { k } from '../../recipes/kata/file-upload'
import { k as inputKata } from '../../recipes/kata/input'
import { Button } from '../button'
import { Icon } from '../icon'
import { InputClearButton } from '../input/input-clear-button'
import { InputFrame } from '../input/input-frame'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { fileUploadMessages } from './file-upload-messages'
import { type FileUploadInputProps, splitProps, useFileUploadState } from './file-upload-state'
import { formatFileNames, selectionSummary } from './file-upload-utilities'

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
 * The display button is not the control. It does not take the id, `required`,
 * or `aria-describedby` of the enclosing `<Control>` / `<Field>`; those go to
 * the hidden input only. The button still shows the disabled state, the
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

	const placeholder = placeholderProp ?? intl.formatMessage(fileUploadMessages.chooseFile)

	const state = useFileUploadState(shared)

	const { multiple } = shared
	const { control, disabled, invalid, files, hasFiles, showTooltip, openPicker, clearFiles } = state

	const glass = useGlass()

	const headless = useHeadless()

	const label = selectionSummary(intl, files, multiple)

	const valueId = useId()

	const fieldRef = useRef<HTMLButtonElement>(null)

	const handleClear = () => {
		clearFiles()

		// Moves focus to the field once the clear button unmounts (WCAG 2.4.3).
		fieldRef.current?.focus()
	}

	// A pick swaps the Browse button for the clear button. Focus moves to the
	// field first, so that the picker gives it back to a control that stays.
	const handleBrowse = () => {
		fieldRef.current?.focus()

		openPicker()
	}

	const variant = control?.variant ?? (glass ? 'glass' : undefined)

	// The display button is not the control, so it takes no Field id, `required`,
	// or `aria-describedby`. It shows the state of the Field through its own props.
	const field = (
		<Tooltip disabled={!showTooltip}>
			<TooltipTrigger>
				<button
					ref={fieldRef}
					type="button"
					data-slot="file-upload-field"
					aria-labelledby={control?.labelledBy ? `${control.labelledBy} ${valueId}` : undefined}
					disabled={disabled}
					{...invalidAttrs(invalid)}
					className={cn(!headless && inputKata({ variant }), k.field, k.cursor)}
					onClick={openPicker}
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
		<div data-slot="file-upload" {...props} className={cn('relative', className)}>
			<FileUploadHiddenInput {...state.hiddenInput} ariaLabel={placeholder} />
			{headless ? (
				<>
					{field}
					{hasFiles && (
						<InputClearButton
							label={intl.formatMessage(fileUploadMessages.clear, { count: files.length })}
							disabled={disabled}
							onClick={handleClear}
						/>
					)}
				</>
			) : (
				<InputFrame
					input={field}
					prefix={undefined}
					suffix={
						hasFiles ? (
							<InputClearButton
								label={intl.formatMessage(fileUploadMessages.clear, { count: files.length })}
								disabled={disabled}
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
							>
								<Icon icon={<Upload />} />
							</Button>
						)
					}
					variant={variant}
					density={size}
				/>
			)}
		</div>
	)
}

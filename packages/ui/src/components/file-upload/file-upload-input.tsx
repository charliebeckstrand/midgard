'use client'

import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/file-upload'
import { Button } from '../button'
import { ControlContext } from '../control/context'
import { Icon } from '../icon'
import { Input } from '../input'
import { InputClearButton } from '../input/input-clear-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { type FileUploadInputProps, useFileUploadState } from './file-upload-state'
import { activateOnEnterSpace, formatFileNames, selectionSummary } from './file-upload-utilities'

/**
 * File picker rendered as a read-only field over a hidden
 * `<input type="file">`. Clicking it opens the picker, and a selection shows
 * the file name with a clear button in the suffix. The clear button gives focus
 * back to the field.
 *
 * @remarks
 * Shares every internal with {@link FileUploadDrop}: the hidden input is the
 * real control, and selection, limits, and announcements run through
 * {@link useFileUploadHandlers}. It takes no children: a read-only field has
 * no slot for them. The `variant` union these three replace shared one
 * `children` prop, and this arm dropped it in silence.
 *
 * The visible field is presentational. It opts out of the enclosing
 * `<Control>` / `<Field>`, so the id, `required` and `aria-describedby` go to
 * the hidden input only. The field still shows the disabled state, the
 * variant and the error ring of the enclosing Field. It is focusable, so it
 * takes the Field Label as its name through `aria-labelledby`.
 *
 * @see {@link FileUploadDrop} · {@link FileUploadButton}
 */
export function FileUploadInput(props: FileUploadInputProps) {
	const state = useFileUploadState(props)

	const { accept, multiple, className, size, placeholder } = props
	const {
		control,
		disabled,
		inputRef,
		files,
		hasFiles,
		showTooltip,
		handleChange,
		openPicker,
		clearFiles,
	} = state

	const label = selectionSummary(files, multiple)

	const fieldRef = useRef<HTMLInputElement>(null)

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

	return (
		<div data-slot="file-upload" className={cn('relative', className)}>
			<FileUploadHiddenInput
				ariaLabel={placeholder ?? 'Choose a file'}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			{/* The display field is not the control. It must not take the Field id,
			    `required` or `aria-describedby`, so it renders outside the Control
			    context and gets its presentational props explicitly. It is focusable,
			    so it also takes the Field Label as its name. */}
			<ControlContext value={undefined}>
				<Tooltip disabled={!showTooltip}>
					<TooltipTrigger>
						<Input
							ref={fieldRef}
							readOnly
							aria-labelledby={control?.labelledBy}
							size={size}
							variant={control?.variant}
							disabled={disabled}
							invalid={control?.severity === 'error' || undefined}
							value={label ?? ''}
							placeholder={placeholder ?? 'Choose a file'}
							onClick={openPicker}
							// The readOnly field opens the picker on activation; responds to
							// keyboard activation like a button.
							onKeyDown={activateOnEnterSpace(openPicker)}
							className={cn('file:hidden', k.cursor)}
							suffix={
								hasFiles ? (
									<InputClearButton
										label="Clear selected file(s)"
										disabled={disabled}
										onClick={handleClear}
									/>
								) : (
									<Button
										type="button"
										variant="bare"
										className="pointer-events-auto"
										aria-label="Browse files"
										disabled={disabled}
										onClick={handleBrowse}
									>
										<Icon icon={<Upload />} />
									</Button>
								)
							}
						/>
					</TooltipTrigger>
					<TooltipContent>{formatFileNames(files)}</TooltipContent>
				</Tooltip>
			</ControlContext>
		</div>
	)
}

'use client'

import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/file-upload'
import { Button } from '../button'
import { Icon } from '../icon'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { type FileUploadButtonProps, useFileUploadState } from './file-upload-state'
import { triggerLabel } from './file-upload-utilities'

/**
 * File picker rendered as a button over a hidden `<input type="file">`.
 *
 * @remarks
 * Shares every internal with {@link FileUploadDrop}. Once a selection exists a
 * `Reset` button joins the trigger, so another file can be picked or the
 * selection cleared without the trigger swapping out. `Reset` gives focus back
 * to the trigger.
 *
 * @see {@link FileUploadDrop} · {@link FileUploadInput}
 */
export function FileUploadButton(props: FileUploadButtonProps) {
	const state = useFileUploadState(props)

	const { accept, multiple, className, children, size, color, variant } = props
	const { control, disabled, invalid, inputRef, hasFiles, handleChange, openPicker, clearFiles } =
		state

	const triggerRef = useRef<HTMLButtonElement>(null)

	const handleReset = () => {
		clearFiles()

		// Moves focus to the trigger once `Reset` unmounts (WCAG 2.4.3).
		triggerRef.current?.focus()
	}

	// The upload trigger always stays; a selection adds `Reset` beside it, so a
	// different file can be picked — or the selection cleared — without the
	// trigger swapping out.
	return (
		<div data-slot="file-upload" className={cn(k.button, className)}>
			<FileUploadHiddenInput
				ariaLabel={triggerLabel(children, 'Upload')}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				invalid={invalid}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			<Button
				ref={triggerRef}
				type="button"
				size={size}
				color={color}
				variant={variant}
				disabled={disabled}
				className={cn(k.cursor)}
				onClick={openPicker}
			>
				<Icon icon={<Upload />} />
				{children ?? 'Upload'}
			</Button>
			{hasFiles && (
				<Button
					type="button"
					size={size}
					variant="soft"
					color="red"
					disabled={disabled}
					className={cn(k.cursor)}
					onClick={handleReset}
				>
					Reset
				</Button>
			)}
		</div>
	)
}

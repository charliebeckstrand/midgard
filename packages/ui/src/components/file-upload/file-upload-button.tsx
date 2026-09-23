'use client'

import { Upload } from 'lucide-react'
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
 * selection cleared without the trigger swapping out.
 *
 * @see {@link FileUploadDrop} · {@link FileUploadInput}
 */
export function FileUploadButton(props: FileUploadButtonProps) {
	const state = useFileUploadState(props)

	const { accept, multiple, className, children, size, color } = props
	const { control, disabled, inputRef, hasFiles, handleChange, openPicker, clearFiles } = state

	// The upload trigger always stays; a selection adds `Reset` beside it, so a
	// different file can be picked — or the selection cleared — without the
	// trigger swapping out.
	return (
		<div data-slot="file-upload" className={cn('inline-flex gap-2', className)}>
			<FileUploadHiddenInput
				ariaLabel={triggerLabel(children, 'Upload')}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			<Button
				type="button"
				size={size}
				color={color}
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
					onClick={clearFiles}
				>
					Reset
				</Button>
			)}
		</div>
	)
}

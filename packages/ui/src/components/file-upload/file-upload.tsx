'use client'

import { Upload } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn, invalidAttrs } from '../../core'
import { k } from '../../recipes/kata/file-upload'
import { AspectRatio, type AspectRatioProps } from '../aspect-ratio'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { Icon } from '../icon'
import { Input } from '../input'
import { type FileRejection, formatFileNames } from './file-upload-utilities'
import { useFileUploadHandlers } from './use-file-upload-handlers'

type FileUploadSharedProps = {
	/** Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). */
	accept?: string
	/** Allow selecting multiple files. */
	multiple?: boolean
	disabled?: boolean
	/** Maximum size per file, in bytes. Oversized files are routed to `onReject`. */
	maxSize?: number
	/** Maximum number of accepted files. Overflow (in selection order) is routed to `onReject`. */
	maxCount?: number
	className?: string
	children?: ReactNode
	/** Fires with the accepted files (after `maxSize`/`maxCount` filtering). */
	onFiles?: (files: File[]) => void
	/** Fires with files excluded by `maxSize`/`maxCount`, each tagged with its reason. */
	onReject?: (rejected: FileRejection[]) => void
}

type FileUploadAreaProps = FileUploadSharedProps & {
	variant?: 'area'
	/** Aspect ratio of the dropzone. */
	ratio?: AspectRatioProps['ratio']
}

type FileUploadInputProps = FileUploadSharedProps & {
	variant: 'input'
	/** Input field size. */
	size?: ControlSize
	/** Placeholder when empty. */
	placeholder?: string
}

type FileUploadButtonProps = FileUploadSharedProps & {
	variant: 'button'
	/** Button size. */
	size?: ControlSize
	/** Button color. */
	color?: ComponentProps<typeof Button>['color']
}

export type FileUploadProps = FileUploadAreaProps | FileUploadInputProps | FileUploadButtonProps

/**
 * File picker over a hidden `<input type="file">`, rendered as one of three
 * `variant`s: a drag-and-drop `area` dropzone, a readonly `input` field, or a
 * `button`. Mirrors enclosing `<Control>`/`<Field>` invalid and required state
 * onto the real input.
 */
export function FileUpload(props: FileUploadProps) {
	const { accept, multiple, disabled, maxSize, maxCount, className, children, onFiles, onReject } =
		props

	// Mirrors Control/Field invalid + required + error-message wiring onto the
	// hidden `<input type="file">`, the real control in every variant. The
	// input variant's visible `<Input>` self-resolves the same context.
	const control = useControl()

	const {
		inputRef,
		dragOver,
		files,
		openPicker,
		handleChange,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = useFileUploadHandlers({ disabled, maxSize, maxCount, onFiles, onReject })

	// The visually-hidden `<input>` still needs an accessible name; screen
	// readers can reach it even at `tabIndex -1`. Each variant passes a name
	// drawn from its visible trigger.
	const renderHiddenInput = (ariaLabel: string) => (
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
			required={control?.required && files.length === 0}
			onChange={handleChange}
			className="sr-only"
			tabIndex={-1}
			{...invalidAttrs(control?.invalid)}
		/>
	)

	if (props.variant === 'input') {
		const { size, placeholder } = props

		const label = formatFileNames(files)

		return (
			<div data-slot="file-upload" className={cn('relative', className)}>
				{renderHiddenInput(placeholder ?? 'Choose a file')}
				<Input
					readOnly
					size={size}
					disabled={disabled}
					value={label ?? ''}
					placeholder={placeholder ?? 'Choose a file'}
					onClick={openPicker}
					// The readOnly field opens the picker on activation; responds to
					// keyboard activation like a button.
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault()

							openPicker()
						}
					}}
					className={cn('file:hidden', k.cursor)}
					suffix={<Icon icon={<Upload />} />}
				/>
			</div>
		)
	}

	if (props.variant === 'button') {
		const { size, color } = props

		return (
			<div data-slot="file-upload" className={cn('inline-flex', className)}>
				{renderHiddenInput(typeof children === 'string' ? children : 'Upload')}
				<Button
					size={size}
					color={color}
					disabled={disabled}
					className={cn(k.cursor)}
					onClick={openPicker}
				>
					<Icon icon={<Upload />} />
					{children ?? 'Upload'}
				</Button>
			</div>
		)
	}

	// Area variant (default dropzone)
	const { ratio } = props

	return (
		<AspectRatio ratio={ratio ?? '16/9'} className="overflow-visible">
			{/* Sibling of the button, not nested inside it: a focusable `<input>`
			    inside an interactive control produces nested-interactive markup. */}
			{renderHiddenInput(typeof children === 'string' ? children : 'Upload file')}
			<button
				type="button"
				data-slot="file-upload"
				data-drag-over={dragOver || undefined}
				disabled={disabled}
				onClick={openPicker}
				onDragOver={handleDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(k.dropzone, 'size-full', className)}
			>
				{children ?? (
					<>
						<Icon icon={<Upload />} size="lg" className={k.icon} />
						<div className={cn(k.label)}>Drop files here or click to browse</div>
					</>
				)}
			</button>
		</AspectRatio>
	)
}

'use client'

import { Upload } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/file-upload'
import { AspectRatio, type AspectRatioProps } from '../aspect-ratio'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Icon } from '../icon'
import { Input } from '../input'
import { formatFileNames } from './file-upload-utilities'
import { useFileUploadHandlers } from './use-file-upload-handlers'

type FileUploadSharedProps = {
	/** Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). */
	accept?: string
	/** Allow selecting multiple files. */
	multiple?: boolean
	disabled?: boolean
	/** Fires with the selected files. */
	className?: string
	children?: ReactNode
	onFiles?: (files: File[]) => void
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

export function FileUpload(props: FileUploadProps) {
	const { accept, multiple, disabled, className, children, onFiles } = props

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
	} = useFileUploadHandlers({ disabled, onFiles })

	// The real <input> is visually hidden and triggered programmatically, so it
	// still needs an accessible name — screen readers can reach it even at
	// tabIndex -1. Each variant passes a name drawn from its visible trigger.
	const renderHiddenInput = (ariaLabel: string) => (
		<input
			ref={inputRef}
			type="file"
			aria-label={ariaLabel}
			accept={accept}
			multiple={multiple}
			disabled={disabled}
			onChange={handleChange}
			className="sr-only"
			tabIndex={-1}
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
			{/* Sibling, not child, of the button: a focusable <input> nested inside
			    an interactive control is a nested-interactive violation. */}
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

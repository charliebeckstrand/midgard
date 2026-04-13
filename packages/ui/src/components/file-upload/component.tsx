'use client'

import { Upload } from 'lucide-react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { AspectRatio, type AspectRatioProps } from '../aspect-ratio'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input } from '../input'
import { useFileHandlers } from './use-file-handlers'
import { formatFileNames } from './utilities'
import { fileUploadClasses } from './variants'

const k = katachi.fileUpload

type FileUploadSharedProps = {
	/** Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). */
	accept?: string
	/** Allow selecting multiple files. */
	multiple?: boolean
	disabled?: boolean
	/** Called with the selected files after a pick or drop. */
	className?: string
	children?: React.ReactNode
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
	size?: 'sm' | 'md' | 'lg'
	/** Placeholder text shown when no file is selected. */
	placeholder?: string
}

type FileUploadButtonProps = FileUploadSharedProps & {
	variant: 'button'
	/** Button size. */
	size?: 'sm' | 'md' | 'lg'
	/** Button color. */
	color?: React.ComponentProps<typeof Button>['color']
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
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = useFileHandlers({ disabled, onFiles })

	const hiddenInput = (
		<input
			ref={inputRef}
			type="file"
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
				{hiddenInput}
				<Input
					readOnly
					size={size}
					disabled={disabled}
					value={label ?? ''}
					placeholder={placeholder ?? 'Choose a file'}
					onClick={openPicker}
					className={cn('file:hidden', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
					suffix={<Icon icon={<Upload />} />}
				/>
			</div>
		)
	}

	if (props.variant === 'button') {
		const { size, color } = props

		return (
			<div data-slot="file-upload" className={cn('inline-flex', className)}>
				{hiddenInput}
				<Button
					size={size}
					color={color}
					disabled={disabled}
					onClick={openPicker}
					className={disabled ? undefined : 'cursor-pointer'}
				>
					{children ?? (
						<>
							<Icon icon={<Upload />} />
							Upload
						</>
					)}
				</Button>
			</div>
		)
	}

	// Area variant (default dropzone)
	const { ratio } = props

	return (
		<AspectRatio ratio={ratio ?? '16/9'} className="overflow-visible">
			<button
				type="button"
				data-slot="file-upload"
				data-drag-over={dragOver || undefined}
				disabled={disabled}
				onClick={openPicker}
				onDragOver={handleDragOver}
				onDragEnter={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(fileUploadClasses, 'size-full', className)}
			>
				{hiddenInput}
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

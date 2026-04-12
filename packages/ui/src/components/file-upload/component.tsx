'use client'

import { Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input } from '../input'
import { fileUploadVariants } from './variants'

const k = katachi.fileUpload

type FileUploadSharedProps = {
	/** Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). */
	accept?: string
	/** Allow selecting multiple files. */
	multiple?: boolean
	disabled?: boolean
	/** Called with the selected files after a pick or drop. */
	onFiles?: (files: File[]) => void
	className?: string
	children?: React.ReactNode
}

type FileUploadAreaProps = FileUploadSharedProps & {
	variant?: 'area'
	/** Dropzone padding size. */
	size?: 'sm' | 'md' | 'lg'
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
	const { variant = 'area', accept, multiple, disabled, onFiles, className, children } = props

	const inputRef = useRef<HTMLInputElement>(null)
	const [dragOver, setDragOver] = useState(false)
	const [files, setFiles] = useState<File[]>([])

	const openPicker = useCallback(() => {
		if (!disabled) inputRef.current?.click()
	}, [disabled])

	const handleFiles = useCallback(
		(fileList: FileList | null) => {
			if (!fileList) return
			const arr = Array.from(fileList)
			setFiles(arr)
			onFiles?.(arr)
		},
		[onFiles],
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files)
		},
		[handleFiles],
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragOver(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragOver(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setDragOver(false)
			handleFiles(e.dataTransfer.files)
		},
		[handleFiles],
	)

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

	if (variant === 'input') {
		const { size, placeholder } = props
		const label = files.length > 0 ? files.map((f) => f.name).join(', ') : undefined

		return (
			<div data-slot="file-upload" className={cn('relative', className)}>
				{hiddenInput}
				<Input
					readOnly
					size={size}
					value={label ?? ''}
					placeholder={placeholder ?? 'Choose a file\u2026'}
					onClick={openPicker}
					className="cursor-pointer file:hidden"
					suffix={<Icon icon={<Upload />} />}
				/>
			</div>
		)
	}

	if (variant === 'button') {
		const { size, color } = props

		return (
			<div data-slot="file-upload" className={cn('inline-flex', className)}>
				{hiddenInput}
				<Button size={size} color={color} disabled={disabled} onClick={openPicker}>
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
	const { size } = props

	return (
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
			className={cn(fileUploadVariants({ size }), className)}
		>
			{hiddenInput}
			{children ?? (
				<>
					<Icon icon={<Upload />} size="lg" className={k.icon} />
					<div className={cn(k.label)}>Drop files here or click to browse</div>
				</>
			)}
		</button>
	)
}

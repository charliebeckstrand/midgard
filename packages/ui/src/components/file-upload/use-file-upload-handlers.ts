'use client'

import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react'
import { announce } from '../../core'
import { fileListToArray, formatFileNames } from './file-upload-utilities'

type FileHandlersOptions = {
	disabled?: boolean
	onFiles?: (files: File[]) => void
}

export function useFileUploadHandlers({ disabled, onFiles }: FileHandlersOptions) {
	const inputRef = useRef<HTMLInputElement>(null)

	// Counter rather than boolean: `dragleave` bubbles on every child boundary
	// crossing. Depth > 0 means the pointer is over the dropzone.
	const [dragDepth, setDragDepth] = useState(0)

	const [files, setFiles] = useState<File[]>([])

	const dragOver = dragDepth > 0

	const openPicker = useCallback(() => {
		if (!disabled) inputRef.current?.click()
	}, [disabled])

	const handleFiles = useCallback(
		(fileList: FileList | null) => {
			if (!fileList) return

			const arr = fileListToArray(fileList)

			setFiles(arr)

			onFiles?.(arr)

			// The selection lands on a visually-hidden input with no audible
			// feedback; announces through the live region (WCAG 4.1.3).
			if (arr.length > 0) {
				const names = formatFileNames(arr)

				announce(arr.length === 1 ? `Selected ${names}` : `Selected ${arr.length} files: ${names}`)
			}
		},
		[onFiles],
	)

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files)

			// Resets the native input value so re-selecting the same file fires a
			// `change` event; the event is suppressed when the value is unchanged.
			e.target.value = ''
		},
		[handleFiles],
	)

	const handleDragEnter = useCallback((e: DragEvent) => {
		e.preventDefault()

		e.stopPropagation()

		setDragDepth((d) => d + 1)
	}, [])

	// `dragover` calls `preventDefault` to permit a drop; state is not changed
	// here — `dragenter`/`dragleave` own the depth counter.
	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()

		e.stopPropagation()
	}, [])

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault()

		e.stopPropagation()

		setDragDepth((d) => Math.max(0, d - 1))
	}, [])

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()

			e.stopPropagation()

			setDragDepth(0)

			handleFiles(e.dataTransfer.files)
		},
		[handleFiles],
	)

	return {
		inputRef,
		dragOver,
		files,
		openPicker,
		handleChange,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	}
}

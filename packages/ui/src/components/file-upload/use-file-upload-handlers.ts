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

	// Counter, not boolean — dragleave bubbles when the cursor crosses into a
	// child element of the dropzone, so a single boolean would flicker false on
	// every child boundary. Track enter/leave depth and treat depth > 0 as over.
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

			// The selection lands on a visually-hidden input (or no visible text at
			// all in the area/button variants), so nothing reaches a screen reader on
			// its own — voice it through the live region (WCAG 4.1.3).
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

			// Reset the native input so picking the same file again still fires a
			// `change` event — otherwise a remove-then-reselect of an identical
			// file silently no-ops because the input's value is unchanged.
			e.target.value = ''
		},
		[handleFiles],
	)

	const handleDragEnter = useCallback((e: DragEvent) => {
		e.preventDefault()

		e.stopPropagation()

		setDragDepth((d) => d + 1)
	}, [])

	// dragover must preventDefault for the browser to permit a drop, but doesn't
	// change state — dragenter/dragleave own the counter.
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

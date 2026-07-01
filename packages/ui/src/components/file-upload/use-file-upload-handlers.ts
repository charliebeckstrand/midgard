'use client'

import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react'
import { announce } from '../../core'
import {
	type FileRejection,
	fileListToArray,
	formatFileNames,
	partitionFiles,
} from './file-upload-utilities'

type FileHandlersOptions = {
	disabled?: boolean
	maxSize?: number
	maxCount?: number
	onFiles?: (files: File[]) => void
	onReject?: (rejected: FileRejection[]) => void
}

/**
 * Drives a hidden `<input type="file">`: opens the native picker, tracks the
 * accepted selection, and wires drag-and-drop. Incoming files (picker or drop)
 * are split through `partitionFiles` against `maxSize`/`maxCount`; accepted
 * files fire `onFiles`, rejected ones fire `onReject`, and the accepted set is
 * announced to a live region. Drag highlight uses a depth counter so nested
 * children don't flicker `dragOver`; `disabled` short-circuits the picker and
 * drop handling.
 *
 * @param options - Constraints (`maxSize`, `maxCount`), the `disabled` flag, and
 * the `onFiles`/`onReject` callbacks.
 * @returns The hidden input `ref`, current `dragOver` flag and accepted `files`,
 * plus the `openPicker`, `handleChange`, `clearFiles`, and drag/drop event
 * handlers to spread onto the trigger and dropzone.
 */
export function useFileUploadHandlers({
	disabled,
	maxSize,
	maxCount,
	onFiles,
	onReject,
}: FileHandlersOptions) {
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

			const { accepted, rejected } = partitionFiles(fileListToArray(fileList), {
				maxSize,
				maxCount,
			})

			setFiles(accepted)

			onFiles?.(accepted)

			if (rejected.length > 0) onReject?.(rejected)

			// The selection lands on a visually-hidden input with no audible
			// feedback; announces through the live region (WCAG 4.1.3).
			if (accepted.length > 0) {
				const names = formatFileNames(accepted)

				announce(
					accepted.length === 1
						? `Selected ${names}`
						: `Selected ${accepted.length} files: ${names}`,
				)
			}
		},
		[maxSize, maxCount, onFiles, onReject],
	)

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			handleFiles(event.target.files)

			// Resets the native input value; the browser suppresses `change` when
			// the value is unchanged (re-selecting the same file).
			event.target.value = ''
		},
		[handleFiles],
	)

	const clearFiles = useCallback(() => {
		setFiles([])

		onFiles?.([])

		// Mirrors handleChange's reset: an empty value lets the same file be
		// picked again immediately after clearing.
		if (inputRef.current) inputRef.current.value = ''
	}, [onFiles])

	// Disabled dropzones skip `preventDefault`: the element never becomes a
	// valid drop target, `data-drag-over` is never set, and the browser
	// handles the drop natively.
	const handleDragEnter = useCallback(
		(event: DragEvent) => {
			if (disabled) return

			event.preventDefault()

			event.stopPropagation()

			setDragDepth((d) => d + 1)
		},
		[disabled],
	)

	// `preventDefault` on `dragover` marks the element a valid drop target;
	// `dragenter`/`dragleave` own the depth counter.
	const handleDragOver = useCallback(
		(event: DragEvent) => {
			if (disabled) return

			event.preventDefault()

			event.stopPropagation()
		},
		[disabled],
	)

	const handleDragLeave = useCallback((event: DragEvent) => {
		event.preventDefault()

		event.stopPropagation()

		setDragDepth((d) => Math.max(0, d - 1))
	}, [])

	const handleDrop = useCallback(
		(event: DragEvent) => {
			// Defensive: with `dragover` unprevented the browser shouldn't target
			// a disabled dropzone, but after a mid-drag `disabled` flip a drop
			// event can still fire here; clear the highlight, ignore the files.
			if (disabled) {
				setDragDepth(0)

				return
			}

			event.preventDefault()

			event.stopPropagation()

			setDragDepth(0)

			handleFiles(event.dataTransfer.files)
		},
		[disabled, handleFiles],
	)

	return {
		inputRef,
		dragOver,
		files,
		openPicker,
		handleChange,
		clearFiles,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	}
}

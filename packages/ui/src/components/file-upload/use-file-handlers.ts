import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react'
import { fileListToArray } from './utilities'

type UseFileHandlersOptions = {
	disabled?: boolean
	onFiles?: (files: File[]) => void
}

export function useFileHandlers({ disabled, onFiles }: UseFileHandlersOptions) {
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
		},
		[onFiles],
	)

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files)
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

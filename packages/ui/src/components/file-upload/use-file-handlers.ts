import { useCallback, useRef, useState } from 'react'
import { fileListToArray } from './utilities'

type UseFileHandlersOptions = {
	disabled?: boolean
	onFiles?: (files: File[]) => void
}

export function useFileHandlers({ disabled, onFiles }: UseFileHandlersOptions) {
	const inputRef = useRef<HTMLInputElement>(null)

	const [dragOver, setDragOver] = useState(false)

	const [files, setFiles] = useState<File[]>([])

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

	return {
		inputRef,
		dragOver,
		files,
		openPicker,
		handleChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	}
}

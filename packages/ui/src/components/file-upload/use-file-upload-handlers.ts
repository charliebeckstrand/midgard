'use client'

import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react'
import { announce } from '../../core'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { useOpenChange } from '../../hooks/use-open-change'
import { useFormValue } from '../form/use-form-value'
import {
	type FileRejection,
	fileListToArray,
	formatFileNames,
	partitionFiles,
} from './file-upload-utilities'

/**
 * Tells if a drag carries files. The browser keeps `dataTransfer.files` empty
 * until the drop, but it lists `'Files'` in `dataTransfer.types` from
 * `dragenter` on. A text, link, or element drag does not list it.
 */
function carriesFiles(event: DragEvent): boolean {
	return event.dataTransfer?.types.includes('Files') ?? false
}

type FileHandlersOptions = {
	/** Binds the selection to an enclosing Form field. */
	name?: string
	/** Controlled selection; `null` is controlled and empty (CONVENTIONS §7.3). */
	value?: File[] | null
	/** Initial selection when uncontrolled. */
	defaultValue?: File[]
	/** Fires with the next selection. A clear reports `[]`. */
	onValueChange?: (files: File[]) => void
	disabled?: boolean
	/** Accepted file types. The picker filters by them too, but a drop does not. */
	accept?: string
	maxSize?: number
	maxCount?: number
	onAccept?: (files: File[]) => void
	onReject?: (rejected: FileRejection[]) => void
	onDragOverChange?: (dragOver: boolean) => void
}

/**
 * Drives a hidden `<input type="file">`: opens the native picker, tracks the
 * accepted selection, and wires drag-and-drop. The selection goes through
 * {@link useFormValue}: a `value` prop wins, then a Form field bound by `name`,
 * then own state seeded from `defaultValue`. The hidden input stays nameless,
 * because the bound value is the `File[]`. An uncontrolled selection goes back
 * to `defaultValue` on a native form reset. Incoming files (picker or drop)
 * are split through `partitionFiles` against `accept`, `maxSize` and
 * `maxCount`. Accepted files fire `onAccept`, rejected ones fire `onReject`,
 * and the accepted set is announced to a live region. A batch with no
 * accepted file keeps the current selection. Drag highlight uses a depth counter so nested
 * children don't flicker `dragOver`; `disabled` short-circuits the picker and
 * drop handling. Only a drag that carries files counts: a text, link, or
 * element drag does not set `dragOver`, and the zone does not claim it.
 *
 * @param options - The value binding (`name`, `value`, `defaultValue`,
 * `onValueChange`), constraints (`accept`, `maxSize`, `maxCount`), the
 * `disabled` flag, and the `onAccept`/`onReject`/`onDragOverChange` callbacks.
 * @returns The hidden input `ref`, the current `dragOver` flag, the selected
 * `files`, and the `invalid` flag of a bound field. It also returns `openPicker`, `handleChange`, `clearFiles`, and the
 * drag/drop event handlers to spread onto the trigger and dropzone.
 */
export function useFileUploadHandlers({
	name,
	value,
	defaultValue,
	onValueChange,
	disabled,
	accept,
	maxSize,
	maxCount,
	onAccept,
	onReject,
	onDragOverChange,
}: FileHandlersOptions) {
	const inputRef = useRef<HTMLInputElement>(null)

	// Counter rather than boolean: `dragleave` bubbles on every child boundary
	// crossing. Depth > 0 means the pointer is over the dropzone.
	const [dragDepth, setDragDepth] = useState(0)

	const {
		value: current,
		controlled,
		setValue: setFiles,
		setTouched,
		invalid,
	} = useFormValue<File[]>(name, {
		value,
		defaultValue: defaultValue ?? [],
		// An empty selection is `[]`, so a cleared value reports as one.
		onValueChange: onValueChange && ((next) => onValueChange(next ?? [])),
	})

	const files = current ?? []

	// The hidden input holds no file between picks, so a native form reset has
	// nothing to revert there. The uncontrolled selection goes back to its seed.
	useFormResetSync(inputRef, !controlled, () => setFiles(defaultValue ?? []))

	const dragOver = dragDepth > 0

	// `dragOver` is derived from the counter, and four routes write that counter.
	// The report watches the committed flag, so a crossing between two children
	// stays silent and a mid-drag `disabled` flip still closes the highlight.
	useOpenChange(dragOver, onDragOverChange)

	const openPicker = useCallback(() => {
		if (!disabled) inputRef.current?.click()
	}, [disabled])

	const handleFiles = useCallback(
		(fileList: FileList | null) => {
			if (!fileList) return

			const { accepted, rejected } = partitionFiles(fileListToArray(fileList), {
				accept,
				maxSize,
				maxCount,
			})

			if (rejected.length > 0) onReject?.(rejected)

			// A text drag or an all-rejected batch accepts no file. It keeps the
			// current selection: only `clearFiles` empties it.
			if (accepted.length === 0) return

			setFiles(accepted)

			setTouched()

			onAccept?.(accepted)

			// The selection lands on a visually-hidden input with no audible
			// feedback; announces through the live region (WCAG 4.1.3).
			const names = formatFileNames(accepted)

			announce(
				accepted.length === 1 ? `Selected ${names}` : `Selected ${accepted.length} files: ${names}`,
			)
		},
		[accept, maxSize, maxCount, onAccept, onReject, setFiles, setTouched],
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

		setTouched()

		onAccept?.([])

		// Mirrors handleChange's reset: an empty value lets the same file be
		// picked again immediately after clearing.
		if (inputRef.current) inputRef.current.value = ''
	}, [onAccept, setFiles, setTouched])

	// Disabled dropzones skip `preventDefault`: the element never becomes a
	// valid drop target, `data-drag-over` is never set, and the browser
	// handles the drop natively. A drag with no file gets the same treatment.
	const handleDragEnter = useCallback(
		(event: DragEvent) => {
			if (disabled || !carriesFiles(event)) return

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
			if (disabled || !carriesFiles(event)) return

			event.preventDefault()

			event.stopPropagation()
		},
		[disabled],
	)

	// Symmetric with `handleDragEnter`: a drag with no file was never counted,
	// so its `dragleave` must not count down.
	const handleDragLeave = useCallback((event: DragEvent) => {
		if (!carriesFiles(event)) return

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
		invalid,
		openPicker,
		handleChange,
		clearFiles,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	}
}

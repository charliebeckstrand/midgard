'use client'

import type { ComponentProps, ReactNode } from 'react'
import type { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import type { FileRejection } from './file-upload-utilities'
import { useFileUploadHandlers } from './use-file-upload-handlers'

/** What every file-upload component takes: the accept and limit rules, and the selection reports. */
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
	/** Fires with the accepted files (after `maxSize`/`maxCount` filtering). */
	onAccept?: (files: File[]) => void
	/** Fires with files excluded by `maxSize`/`maxCount`, each tagged with its reason. */
	onReject?: (rejected: FileRejection[]) => void
	/**
	 * Fires when the dropzone starts or stops to hold a dragged file.
	 *
	 * The flag drives `data-drag-over` and nothing else, so a consumer that wants
	 * its own drop affordance has to watch that attribute. Use this callback
	 * instead. A drag across a child of the dropzone fires nothing, because the
	 * pointer never leaves the zone. A drop, a cancel, and a drag that exits all
	 * report `false`.
	 */
	onDragOverChange?: (dragOver: boolean) => void
}

/**
 * Props for {@link FileUploadDrop}: the shared accept and limit rules, plus the
 * prompt the empty zone shows.
 */
export type FileUploadDropProps = FileUploadSharedProps & {
	/**
	 * Replaces the built-in icon-and-prompt inside the empty zone, and names the
	 * hidden input. The zone keeps its own height; set another through
	 * `className`, as `<SignaturePad>` does.
	 */
	children?: ReactNode
}

/** Props for {@link FileUploadInput}: the shared accept and limit rules, plus the field's size and placeholder. */
export type FileUploadInputProps = FileUploadSharedProps & {
	/** Input field size. */
	size?: ControlSize
	/**
	 * Placeholder when empty; also the hidden input's accessible name.
	 *
	 * @defaultValue `'Choose a file'`
	 */
	placeholder?: string
}

/** Props for {@link FileUploadButton}: the shared accept and limit rules, plus the button's size, color, and label. */
export type FileUploadButtonProps = FileUploadSharedProps & {
	/** Button size. */
	size?: ControlSize
	/** Button color. */
	color?: ComponentProps<typeof Button>['color']
	/**
	 * The trigger's label, and the hidden input's accessible name.
	 *
	 * @defaultValue `'Upload'`
	 */
	children?: ReactNode
}

/** Hook output plus the derived selection flags every variant renderer shares. */
export type FileUploadRenderState = ReturnType<typeof useFileUploadHandlers> & {
	control: ReturnType<typeof useControl>
	hasFiles: boolean
	/** Forces the selection tooltip open for the "x files selected" summary,
	 * whose collapsed count hides the names. A single name needs it only when
	 * clipped — the `drop` variant detects that per render (`useIsTruncated`); the
	 * `input` variant relies on this flag alone. */
	showTooltip: boolean
}

/**
 * The state every file-upload component shares: the hidden input's handlers,
 * the resolved Control context, and the two derived selection flags.
 *
 * @remarks
 * The three components differ in what they draw, not in how they pick. This is
 * the "how", held once, which is what made three explicit components cheaper
 * than the `variant` discriminant they replace.
 *
 * @internal
 */
export function useFileUploadState(props: FileUploadSharedProps): FileUploadRenderState {
	const { multiple, disabled, maxSize, maxCount, onAccept, onReject, onDragOverChange } = props

	// Mirrors Control/Field id + invalid + required + error-message wiring onto
	// the hidden `<input type="file">`, the real control in each component. The
	// visible `<Input>` of FileUploadInput opts out of this context.
	const control = useControl()

	const handlers = useFileUploadHandlers({
		disabled,
		maxSize,
		maxCount,
		onAccept,
		onReject,
		onDragOverChange,
	})

	return {
		...handlers,
		control,
		hasFiles: handlers.files.length > 0,
		showTooltip: Boolean(multiple && handlers.files.length > 1),
	}
}

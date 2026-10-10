'use client'

import type { ComponentProps, ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import type { scale as buttonScale } from '../../recipes/kata/button'
import type { scale as controlScale } from '../../recipes/kata/control'
import type { Button } from '../button'
import { useControl } from '../control/context'
import type { FileRejection } from './file-upload-utilities'
import { useFileUploadHandlers } from './use-file-upload-handlers'

/** What every file-upload component takes: the value binding, the accept and limit rules, and the selection reports. */
type FileUploadSharedProps = {
	/**
	 * Binds the selection to an enclosing Form field. `Form.defaultValues` seeds
	 * a `File[]`. The hidden file input stays nameless.
	 */
	name?: string
	/** The selected files (controlled). `null` is controlled and empty (CONVENTIONS §7.3). */
	value?: File[] | null
	/** The initial selection (uncontrolled). A native form reset goes back to it. */
	defaultValue?: File[]
	/** Fires with the next selection, as `onAccept` does. A clear fires with `[]`. */
	onValueChange?: (files: File[]) => void
	/**
	 * Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). The picker shows
	 * only these, and a dropped file of a different type goes to `onReject`.
	 */
	accept?: string
	/**
	 * Allow selecting multiple files. Without it, a drop of more than one file
	 * keeps the first, and the rest go to `onReject`.
	 * @defaultValue false
	 */
	multiple?: boolean
	/**
	 * Disables the picker. Without the prop, the component takes the disabled state of the enclosing Control.
	 * @defaultValue `false`, or the state of the enclosing Control or Field.
	 */
	disabled?: boolean
	/** Maximum size per file, in bytes. Oversized files are routed to `onReject`. */
	maxSize?: number
	/** Maximum number of accepted files. Overflow (in selection order) is routed to `onReject`. */
	maxCount?: number
	className?: string
	/**
	 * Fires with the accepted files (after `accept`, `multiple`, `maxSize` and
	 * `maxCount` filtering). A pick or a drop that accepts no file keeps the
	 * current selection and does not fire. A clear fires with `[]`.
	 */
	onAccept?: (files: File[]) => void
	/**
	 * Fires with files excluded by `accept`, `multiple`, `maxSize` or
	 * `maxCount`, each tagged with its reason.
	 */
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
	 * `className`, as `<SignaturePad>` does. The empty zone is a `<button>`, so
	 * the children must be phrasing content with no interactive element.
	 */
	children?: ReactNode
}

/** Props for {@link FileUploadInput}: the shared accept and limit rules, plus the field's size and placeholder. */
export type FileUploadInputProps = FileUploadSharedProps & {
	/**
	 * The density step of the field. Omit it to take the step of the nearest
	 * density scope. A step makes the field a density scope.
	 */
	size?: ScaleStep<typeof controlScale>
	/**
	 * Placeholder when empty; also the hidden input's accessible name.
	 *
	 * @defaultValue 'Choose a file'
	 */
	placeholder?: string
}

/** Props for {@link FileUploadButton}: the shared accept and limit rules, plus the button's size, color, and label. */
export type FileUploadButtonProps = FileUploadSharedProps & {
	/**
	 * The density step of the button. Omit it to take the step of the nearest
	 * density scope. A step makes the button a density scope.
	 */
	size?: ScaleStep<typeof buttonScale>
	/** The palette color of the button. @defaultValue 'zinc' */
	color?: ComponentProps<typeof Button>['color']
	/**
	 * The trigger's label, and the hidden input's accessible name.
	 *
	 * @defaultValue 'Upload'
	 */
	children?: ReactNode
}

/** Hook output plus the derived selection flags every variant renderer shares. */
export type FileUploadRenderState = ReturnType<typeof useFileUploadHandlers> & {
	control: ReturnType<typeof useControl>
	/** The `disabled` prop, else the disabled state of the enclosing Control. */
	disabled: boolean | undefined
	/** The error state of the enclosing Control, or an error on the bound Form field. */
	invalid: true | undefined
	hasFiles: boolean
	/** Forces the selection tooltip open for the "x files selected" summary,
	 * whose collapsed count hides the names. A single name needs it only when
	 * clipped — the `drop` variant detects that per render (`useIsTruncated`); the
	 * `input` variant relies on this flag alone. */
	showTooltip: boolean
}

/**
 * The state every file-upload component shares: the hidden input's handlers,
 * the resolved Control context, the merged `invalid` flag, and the two derived
 * selection flags.
 *
 * @remarks
 * The three components differ in what they draw, not in how they pick. This is
 * the "how", held once, which is what made three explicit components cheaper
 * than the `variant` discriminant they replace.
 *
 * @internal
 */
export function useFileUploadState(props: FileUploadSharedProps): FileUploadRenderState {
	const {
		name,
		value,
		defaultValue,
		onValueChange,
		accept,
		multiple,
		maxSize,
		maxCount,
		onAccept,
		onReject,
		onDragOverChange,
	} = props

	// Mirrors Control/Field id + invalid + required + error-message wiring onto
	// the hidden `<input type="file">`, the real control in each component. The
	// visible `<Input>` of FileUploadInput opts out of this context.
	const control = useControl()

	// The same cascade as `useControlProps`: an explicit prop wins over the Control.
	const disabled = props.disabled ?? control?.disabled

	const handlers = useFileUploadHandlers({
		name,
		value,
		defaultValue,
		onValueChange,
		disabled,
		accept,
		maxSize,
		// A single-file component takes one file at most. The picker holds to
		// that, but a drop can carry many.
		maxCount: multiple ? maxCount : Math.min(maxCount ?? 1, 1),
		onAccept,
		onReject,
		onDragOverChange,
	})

	return {
		...handlers,
		control,
		disabled,
		invalid: control?.severity === 'error' || handlers.invalid || undefined,
		hasFiles: handlers.files.length > 0,
		showTooltip: Boolean(multiple && handlers.files.length > 1),
	}
}

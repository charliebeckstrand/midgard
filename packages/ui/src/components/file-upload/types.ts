import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import type { scale as buttonScale } from '../../recipes/kata/button'
import type { scale as controlScale } from '../../recipes/kata/control'
import type { Button } from '../button'
import type { FileRejection } from './file-upload-utilities'

/** What every file-upload component takes: the value binding, the accept and limit rules, and the selection reports. @internal */
export type FileUploadSharedProps = {
	/**
	 * Binds the selection to an enclosing Form field. `Form.defaultValues` seeds
	 * a `File[]`. The hidden file input stays nameless.
	 */
	name?: string
	/** The selected files (controlled). `null` is controlled and empty (CONVENTIONS §7.3). */
	value?: File[] | null
	/** The initial selection (uncontrolled). A native form reset goes back to it. */
	defaultValue?: File[]
	/** Fires when the selection changes, with the next selection, as `onAccept` does. A clear fires with `[]`. */
	onValueChange?: (files: File[]) => void
	/**
	 * Accepted file types (e.g. `"image/*"`, `".pdf,.doc"`). The picker shows
	 * only these, and a dropped file of a different type goes to `onReject`.
	 */
	accept?: string
	/**
	 * Allows the selection of more than one file. Without it, a drop of more than
	 * one file keeps the first, and the rest go to `onReject`.
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
	 * Fires when the component accepts files, with the accepted files (after
	 * `accept`, `multiple`, `maxSize` and `maxCount` filtering). A selection or a drop
	 * that accepts no file keeps the current selection and does not fire. A clear
	 * fires with `[]`.
	 */
	onAccept?: (files: File[]) => void
	/**
	 * Fires when `accept`, `multiple`, `maxSize`, or `maxCount` excludes files,
	 * with each excluded file tagged with its reason.
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
 * prompt the empty zone shows. The zone takes the rest: a `<button>` while it
 * is empty, or else a `<div>`. `defaultValue` holds files.
 */
export type FileUploadDropProps = Omit<HTMLAttributes<HTMLElement>, 'defaultValue'> &
	FileUploadSharedProps & {
		/**
		 * Replaces the built-in icon-and-prompt inside the empty zone, and names the
		 * hidden input. The zone keeps its own height; set another through
		 * `className`, as `<SignaturePad>` does. The empty zone is a `<button>`, so
		 * the children must be phrasing content with no interactive element.
		 */
		children?: ReactNode
	}

/**
 * Props for {@link FileUploadInput}: the shared accept and limit rules, plus the field's size and placeholder.
 * The root `<div>` takes the rest. The field takes no children, and `defaultValue` holds files.
 */
export type FileUploadInputProps = Omit<ComponentProps<'div'>, 'defaultValue' | 'children'> &
	FileUploadSharedProps & {
		/**
		 * The density step of the field. Omit it to take the step of the nearest
		 * density scope. A step makes the field a density scope.
		 */
		size?: ScaleStep<typeof controlScale>
		/**
		 * Placeholder when empty; also the hidden input's accessible name.
		 *
		 * @defaultValue `'Choose a file'`, in the language of the reader.
		 */
		placeholder?: string
	}

/**
 * Props for {@link FileUploadButton}: the shared accept and limit rules, plus the button's size, color, and label.
 * The root `<div>` takes the rest. `color` is the color of the button, and `defaultValue` holds files.
 */
export type FileUploadButtonProps = Omit<ComponentProps<'div'>, 'defaultValue' | 'color'> &
	FileUploadSharedProps & {
		/**
		 * The density step of the button. Omit it to take the step of the nearest
		 * density scope. A step makes the button a density scope.
		 */
		size?: ScaleStep<typeof buttonScale>
		/** The palette color of the button. @defaultValue 'zinc' */
		color?: ComponentProps<typeof Button>['color']
		/**
		 * The style of the button, such as `plain` for an add button among others.
		 *
		 * @defaultValue `'solid'`, or the variant of the surface around the button, as for {@link Button}.
		 */
		variant?: ComponentProps<typeof Button>['variant']
		/**
		 * The trigger's label, and the hidden input's accessible name.
		 *
		 * @defaultValue `'Upload'`, in the language of the reader.
		 */
		children?: ReactNode
	}

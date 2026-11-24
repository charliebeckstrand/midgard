import type { ReactNode } from 'react'
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
	 *
	 * The callback does not change the `invalidMessage`. With the callback and
	 * `invalidMessage={null}`, the caller owns the feedback of a refusal, and
	 * the live region does not speak it: show it in a `<Message>`, which is a
	 * live region, so that a screen reader speaks it too.
	 */
	onReject?: (rejected: FileRejection[]) => void
	/**
	 * Error message shown after a pick or a drop that refuses files, as an error
	 * `<Message>` below the component. It has an id of its own, wired into the
	 * `aria-describedby` of the trigger, also outside a Field. It shows until the
	 * next pick, drop, or clear. While it shows, the live region does not also
	 * announce the refusal. Give your own text here to explain a refusal. Pass
	 * `null` (or `false`) to show no message; the live region then announces the
	 * refusal, unless `onReject` is set.
	 *
	 * @defaultValue The refused files and the reason of each, with the limit that refused them, in the language of the reader.
	 */
	invalidMessage?: ReactNode
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

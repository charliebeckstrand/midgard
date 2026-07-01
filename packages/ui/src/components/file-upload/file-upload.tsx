'use client'

import { Upload, X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/file-upload'
import { AspectRatio, type AspectRatioProps } from '../aspect-ratio'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { Icon } from '../icon'
import { Input } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import {
	activateOnEnterSpace,
	type FileRejection,
	formatFileNames,
	selectionSummary,
	triggerLabel,
} from './file-upload-utilities'
import { useFileUploadHandlers } from './use-file-upload-handlers'

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
	children?: ReactNode
	/** Fires with the accepted files (after `maxSize`/`maxCount` filtering). */
	onFiles?: (files: File[]) => void
	/** Fires with files excluded by `maxSize`/`maxCount`, each tagged with its reason. */
	onReject?: (rejected: FileRejection[]) => void
}

type FileUploadDropProps = FileUploadSharedProps & {
	/**
	 * Selects the dropzone layout. Optional discriminant — the default variant.
	 *
	 * @defaultValue `'drop'`
	 */
	variant?: 'drop'
	/**
	 * Aspect ratio of the dropzone.
	 *
	 * @defaultValue `'16/9'`
	 */
	ratio?: AspectRatioProps['ratio']
}

type FileUploadInputProps = FileUploadSharedProps & {
	variant: 'input'
	/** Input field size. */
	size?: ControlSize
	/**
	 * Placeholder when empty; also the hidden input's accessible name.
	 *
	 * @defaultValue `'Choose a file'`
	 */
	placeholder?: string
}

type FileUploadButtonProps = FileUploadSharedProps & {
	variant: 'button'
	/** Button size. */
	size?: ControlSize
	/** Button color. */
	color?: ComponentProps<typeof Button>['color']
}

/**
 * Props for {@link FileUpload}, discriminated on `variant`: `'drop'` (default
 * drag-and-drop area), `'input'` (readonly field), or `'button'`. Each variant
 * adds its own layout props atop the shared accept/limit/callback set.
 *
 * @see {@link FileUpload}
 */
export type FileUploadProps = FileUploadDropProps | FileUploadInputProps | FileUploadButtonProps

/** Hook output plus the derived selection flags every variant renderer shares. */
type FileUploadRenderState = ReturnType<typeof useFileUploadHandlers> & {
	control: ReturnType<typeof useControl>
	hasFiles: boolean
	/** A tooltip disambiguates the "x files selected" summary; a single name is
	 * already fully visible, so it never needs one. */
	showTooltip: boolean
}

/**
 * File picker over a hidden `<input type="file">`, rendered as one of three
 * `variant`s: a drag-and-drop `drop` area, a readonly `input` field, or a
 * `button`. Mirrors enclosing `<Control>`/`<Field>` invalid and required state
 * onto the real input.
 *
 * @remarks
 * The visually-hidden input is the real control in every variant and carries the
 * accessible name; the visible trigger is presentational. Accepted selections are
 * announced to a live region (WCAG 4.1.3). Selection state, drag highlighting, and
 * `maxSize`/`maxCount` filtering live in {@link useFileUploadHandlers}. Once a
 * selection exists, `drop` and `input` show the file name (or an "x files
 * selected" summary once `multiple` yields more than one, tooltipped with the
 * full list) and a control to clear it — a suffix button for `input`, a `Reset`
 * button under the label for `drop`; `button` swaps its trigger for `Reset`.
 *
 * @see {@link FileUploadProps}
 * @see {@link useFileUploadHandlers}
 */
export function FileUpload(props: FileUploadProps) {
	const { multiple, disabled, maxSize, maxCount, onFiles, onReject } = props

	// Mirrors Control/Field invalid + required + error-message wiring onto the
	// hidden `<input type="file">`, the real control in every variant. The
	// input variant's visible `<Input>` self-resolves the same context.
	const control = useControl()

	const handlers = useFileUploadHandlers({ disabled, maxSize, maxCount, onFiles, onReject })

	const state: FileUploadRenderState = {
		...handlers,
		control,
		hasFiles: handlers.files.length > 0,
		showTooltip: Boolean(multiple && handlers.files.length > 1),
	}

	if (props.variant === 'input') return renderInputVariant(props, state)

	if (props.variant === 'button') return renderButtonVariant(props, state)

	return renderDropVariant(props, state)
}

function renderInputVariant(props: FileUploadInputProps, state: FileUploadRenderState) {
	const { accept, multiple, disabled, className, size, placeholder } = props
	const { control, inputRef, files, hasFiles, showTooltip, handleChange, openPicker, clearFiles } =
		state

	const label = selectionSummary(files, multiple)

	return (
		<div data-slot="file-upload" className={cn('relative', className)}>
			<FileUploadHiddenInput
				ariaLabel={placeholder ?? 'Choose a file'}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			<Tooltip enabled={showTooltip}>
				<TooltipTrigger>
					<Input
						readOnly
						size={size}
						disabled={disabled}
						value={label ?? ''}
						placeholder={placeholder ?? 'Choose a file'}
						onClick={openPicker}
						// The readOnly field opens the picker on activation; responds to
						// keyboard activation like a button.
						onKeyDown={activateOnEnterSpace(openPicker)}
						className={cn('file:hidden', k.cursor)}
						suffix={
							hasFiles ? (
								<Button
									variant="bare"
									className="pointer-events-auto"
									aria-label="Clear selected file(s)"
									disabled={disabled}
									onClick={clearFiles}
								>
									<Icon icon={<X />} />
								</Button>
							) : (
								<Icon icon={<Upload />} />
							)
						}
					/>
				</TooltipTrigger>
				<TooltipContent>{formatFileNames(files)}</TooltipContent>
			</Tooltip>
		</div>
	)
}

function renderButtonVariant(props: FileUploadButtonProps, state: FileUploadRenderState) {
	const { accept, multiple, disabled, className, children, size, color } = props
	const { control, inputRef, hasFiles, handleChange, openPicker, clearFiles } = state

	return (
		<div data-slot="file-upload" className={cn('inline-flex', className)}>
			<FileUploadHiddenInput
				ariaLabel={triggerLabel(children, 'Upload')}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			{hasFiles ? (
				<Button
					size={size}
					variant="soft"
					color="red"
					disabled={disabled}
					className={cn(k.cursor)}
					onClick={clearFiles}
				>
					Reset
				</Button>
			) : (
				<Button
					size={size}
					color={color}
					disabled={disabled}
					className={cn(k.cursor)}
					onClick={openPicker}
				>
					<Icon icon={<Upload />} />
					{children ?? 'Upload'}
				</Button>
			)}
		</div>
	)
}

/** The dropzone's icon plus its label/reset content, shared by both interactivity states. */
function dropContent(props: FileUploadDropProps, state: FileUploadRenderState) {
	const { children, multiple, disabled } = props
	const { files, hasFiles, showTooltip, clearFiles } = state

	return (
		children ??
		(hasFiles ? (
			<>
				<Tooltip enabled={showTooltip}>
					<TooltipTrigger>
						<div className={cn(k.label)}>{selectionSummary(files, multiple)}</div>
					</TooltipTrigger>
					<TooltipContent>{formatFileNames(files)}</TooltipContent>
				</Tooltip>
				<Button variant="soft" color="red" disabled={disabled} onClick={clearFiles}>
					Reset
				</Button>
			</>
		) : (
			<>
				<Icon icon={<Upload />} size="lg" className={k.icon} />
				<div className={cn(k.label)}>Drop files here or click to browse</div>
			</>
		))
	)
}

function renderDropVariant(props: FileUploadDropProps, state: FileUploadRenderState) {
	const { accept, multiple, disabled, className, children, ratio } = props
	const {
		control,
		inputRef,
		hasFiles,
		handleChange,
		openPicker,
		dragOver,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = state

	const dragProps = {
		'data-drag-over': dataAttr(dragOver),
		onDragOver: handleDragOver,
		onDragEnter: handleDragEnter,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
	}

	return (
		<AspectRatio ratio={ratio ?? '16/9'} className="overflow-visible">
			{/* Sibling of the trigger, not nested inside it: a focusable `<input>`
			    inside an interactive control produces nested-interactive markup. */}
			<FileUploadHiddenInput
				ariaLabel={triggerLabel(children, 'Upload file')}
				control={control}
				inputRef={inputRef}
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				filesEmpty={!hasFiles}
				onChange={handleChange}
			/>
			{hasFiles ? (
				// Static: once files land, the Reset button in `dropContent` is the
				// sole focusable control. A real `<button>` here would nest one
				// interactive element inside another.
				<div
					data-slot="file-upload"
					data-disabled={dataAttr(disabled)}
					className={cn(k.dropzone, 'size-full', className)}
					{...dragProps}
				>
					{dropContent(props, state)}
				</div>
			) : (
				<button
					type="button"
					data-slot="file-upload"
					disabled={disabled}
					onClick={openPicker}
					className={cn(k.dropzone, 'size-full', className)}
					{...dragProps}
				>
					{dropContent(props, state)}
				</button>
			)}
		</AspectRatio>
	)
}

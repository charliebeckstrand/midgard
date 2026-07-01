'use client'

import { Upload, X } from 'lucide-react'
import { type ComponentProps, type ReactNode, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useIsTruncated } from '../../hooks'
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
	/** Forces the selection tooltip open for the "x files selected" summary,
	 * whose collapsed count hides the names. A single name needs it only when
	 * clipped — the `drop` variant detects that per render (`useIsTruncated`); the
	 * `input` variant relies on this flag alone. */
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
 * selected" summary once `multiple` yields more than one) and a control to clear
 * it — a suffix button for `input`, a `Reset` button under the label for `drop`.
 * The `drop` label truncates to one line and reveals the full name(s) in a
 * tooltip when the summary hides them or a single name is clipped, and its
 * dropzone stays clickable, focusable, and keyboard-operable so a different file
 * can be picked without clearing first. `button` swaps its trigger for `Reset`,
 * except under `multiple`, where the upload trigger stays and `Reset` sits beside
 * it.
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
								<Button
									variant="bare"
									className="pointer-events-auto"
									aria-label="Browse files"
									disabled={disabled}
									onClick={openPicker}
								>
									<Icon icon={<Upload />} />
								</Button>
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

	// A single-file selection swaps the trigger for `Reset`. Under `multiple` the
	// upload trigger stays and `Reset` sits beside it, so more files can be picked
	// without clearing first.
	const showUpload = !hasFiles || multiple

	return (
		<div data-slot="file-upload" className={cn('inline-flex gap-2', className)}>
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
			{showUpload && (
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
			{hasFiles && (
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
			)}
		</div>
	)
}

/** The empty dropzone's icon and prompt, or the caller's `children` in its place. */
function dropPrompt(children: ReactNode) {
	return (
		children ?? (
			<>
				<Icon icon={<Upload />} size="lg" className={k.icon} />
				<div className={cn(k.label)}>Drop files here or click to browse</div>
			</>
		)
	)
}

/** Props for {@link DropSelection}. @internal */
type DropSelectionProps = {
	files: File[]
	multiple?: boolean
	disabled?: boolean
	/** Forces the tooltip open for the multi-file summary (see {@link FileUploadRenderState.showTooltip}). */
	alwaysTooltip: boolean
	/** Re-opens the picker; also fired by clicking the dropzone overlay. */
	onPick: () => void
	onClear: () => void
}

/**
 * The `drop` variant's filled state: a full-area overlay trigger to re-pick,
 * the selection label, and a `Reset` button. The overlay is a sibling of
 * `Reset` (never its parent, which would nest interactive controls); the label
 * paints above it but stays `pointer-events-none`, so a click anywhere but
 * `Reset` re-opens the picker. The label truncates to one line, and the overlay
 * — as the tooltip trigger — reveals the full name(s) on hover or focus when the
 * multi-file summary hides them or a single name is clipped.
 *
 * @internal
 */
function DropSelection({
	files,
	multiple,
	disabled,
	alwaysTooltip,
	onPick,
	onClear,
}: DropSelectionProps) {
	const labelRef = useRef<HTMLDivElement>(null)

	const text = selectionSummary(files, multiple) ?? ''

	const truncated = useIsTruncated(labelRef, text)

	return (
		<>
			<Tooltip enabled={alwaysTooltip || truncated}>
				<TooltipTrigger>
					<button
						type="button"
						aria-label="Choose a different file"
						disabled={disabled}
						onClick={onPick}
						className={cn(k.overlay)}
					/>
				</TooltipTrigger>
				<TooltipContent>{formatFileNames(files)}</TooltipContent>
			</Tooltip>
			{/* Above the overlay so it reads, but click-transparent so the overlay
			    still catches the pick anywhere the text sits. */}
			<div
				ref={labelRef}
				className={cn(k.label, 'pointer-events-none relative z-10 w-full truncate text-center')}
			>
				{text}
			</div>
			<Button
				variant="soft"
				color="red"
				disabled={disabled}
				onClick={onClear}
				className="relative z-10"
			>
				Reset
			</Button>
		</>
	)
}

function renderDropVariant(props: FileUploadDropProps, state: FileUploadRenderState) {
	const { accept, multiple, disabled, className, children, ratio } = props
	const {
		control,
		inputRef,
		files,
		hasFiles,
		showTooltip,
		handleChange,
		openPicker,
		clearFiles,
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

	// The built-in filled state carries its own `Reset` button, which can't nest
	// inside a trigger `<button>`; it renders a plain container plus the overlay
	// trigger in {@link DropSelection}. Empty, or caller `children` (no built-in
	// Reset): a single trigger `<button>` opens the picker.
	const filled = hasFiles && children == null

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
			{filled ? (
				<div
					data-slot="file-upload"
					data-disabled={dataAttr(disabled)}
					className={cn(k.dropzone, 'relative size-full', className)}
					{...dragProps}
				>
					<DropSelection
						files={files}
						multiple={multiple}
						disabled={disabled}
						alwaysTooltip={showTooltip}
						onPick={openPicker}
						onClear={clearFiles}
					/>
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
					{dropPrompt(children)}
				</button>
			)}
		</AspectRatio>
	)
}

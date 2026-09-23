'use client'

import { Upload } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useIsTruncated } from '../../hooks'
import { k } from '../../recipes/kata/file-upload'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { type FileUploadDropProps, useFileUploadState } from './file-upload-state'
import { formatFileNames, selectionSummary, triggerLabel } from './file-upload-utilities'

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
 * `Reset`, never its parent, which would nest interactive controls. The label
 * paints above it but stays `pointer-events-none`, so a click anywhere but
 * `Reset` re-opens the picker. The label truncates to one line. The overlay, as
 * the tooltip trigger, reveals the full name(s) on hover or focus. That happens
 * when the multi-file summary hides them, or a single name is clipped.
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
			<Tooltip disabled={!alwaysTooltip && !truncated}>
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
				type="button"
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

/**
 * Drag-and-drop file zone over a hidden `<input type="file">`. Files drop onto
 * it or a click opens the picker, and it mirrors enclosing `<Control>` /
 * `<Field>` invalid and required state onto the real input.
 *
 * @remarks
 * The visually-hidden input is the real control and carries the accessible
 * name; the visible zone is presentational. Accepted selections are announced
 * to a live region (WCAG 4.1.3). Selection state, drag highlighting, and
 * `maxSize` / `maxCount` filtering live in {@link useFileUploadHandlers}.
 *
 * Once a selection exists the zone shows the file name and a `Reset` button
 * under it. A `multiple` selection past one shows an "x files selected"
 * summary instead. The label truncates to one line and reveals the full name
 * or names in a tooltip. The zone stays clickable, focusable, and keyboard-operable, so
 * another file can be picked without clearing first.
 *
 * It stands a fixed height and takes another through `className`, the way
 * `<SignaturePad>` does. It used to wrap itself in an `<AspectRatio>` for a
 * `ratio` prop, which is a whole dependency for what one class states.
 *
 * @see {@link FileUploadInput} · {@link FileUploadButton}
 * @see {@link useFileUploadHandlers}
 */
export function FileUploadDrop(props: FileUploadDropProps) {
	const state = useFileUploadState(props)

	const { accept, multiple, className, children } = props
	const {
		control,
		disabled,
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
		<>
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
					className={cn(k.dropzone, 'relative h-40 w-full', className)}
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
					className={cn(k.dropzone, 'h-40 w-full', className)}
					{...dragProps}
				>
					{dropPrompt(children)}
				</button>
			)}
		</>
	)
}

'use client'

import { Upload } from 'lucide-react'
import {
	type ChangeEvent,
	type DragEvent,
	type ReactNode,
	type Ref,
	useEffect,
	useId,
	useRef,
} from 'react'
import { cn, dataAttr, invalidAttrs } from '../../core'
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
				<span className={cn('block', k.label)}>Drop files here or click to browse</span>
			</>
		)
	)
}

/** Props for {@link DropSelection}. @internal */
type DropSelectionProps = {
	files: File[]
	multiple?: boolean
	disabled?: boolean
	/** The id of the enclosing Field Label. With it, the overlay takes the Label and the selection text as its name. */
	labelledBy?: string
	/** Marks the overlay invalid, from the error state of the enclosing Field. */
	invalid?: boolean
	/** Forces the tooltip open for the multi-file summary (see {@link FileUploadRenderState.showTooltip}). */
	alwaysTooltip: boolean
	/** Takes the overlay trigger, so that focus can move to it after the swap. */
	overlayRef: Ref<HTMLButtonElement>
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
	labelledBy,
	invalid,
	alwaysTooltip,
	overlayRef,
	onPick,
	onClear,
}: DropSelectionProps) {
	const labelRef = useRef<HTMLDivElement>(null)

	const textId = useId()

	const text = selectionSummary(files, multiple) ?? ''

	const truncated = useIsTruncated(labelRef, text)

	return (
		<>
			<Tooltip disabled={!alwaysTooltip && !truncated}>
				<TooltipTrigger>
					<button
						ref={overlayRef}
						type="button"
						aria-label="Choose a different file"
						// A Field Label wins over `aria-label`, so the name is the Label
						// and then the selection text.
						aria-labelledby={labelledBy ? `${labelledBy} ${textId}` : undefined}
						disabled={disabled}
						{...invalidAttrs(invalid)}
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
				id={textId}
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
 * The visually-hidden input is the real control. It takes the id, `required`,
 * and `aria-describedby` of the enclosing `<Control>` / `<Field>`. The visible
 * zone does not take them, but its focusable buttons show the error state of
 * the Field. In a Field with a Label, the name of the empty zone is the Label
 * and then the prompt, and the name of the overlay is the Label and then the
 * selection text, through `aria-labelledby`. With no Label, the empty zone
 * takes its name from its content, and the overlay keeps the name "Choose a
 * different file". Accepted selections are announced to a live region (WCAG
 * 4.1.3). Selection state, drag highlighting, and `maxSize` / `maxCount`
 * filtering live in {@link useFileUploadHandlers}.
 *
 * Once a selection exists the zone shows the file name and a `Reset` button
 * under it. A `multiple` selection past one shows an "x files selected"
 * summary instead. The label truncates to one line and reveals the full name
 * or names in a tooltip. The zone stays clickable, focusable, and keyboard-operable, so
 * another file can be picked without clearing first.
 *
 * The swap between the empty and the filled state replaces the focusable
 * control. When focus is in the zone at a pick, a drop, or a `Reset`, it moves
 * to the control that replaces it (WCAG 2.4.3).
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

	// The built-in filled state carries its own `Reset` button, which can't nest
	// inside a trigger `<button>`; it renders a plain container plus the overlay
	// trigger in {@link DropSelection}. Empty, or caller `children` (no built-in
	// Reset): a single trigger `<button>` opens the picker.
	const filled = hasFiles && children == null

	// The root of each state. One of the two is mounted at a time. The root of
	// the empty state is also its trigger.
	const emptyRef = useRef<HTMLButtonElement>(null)

	const filledRef = useRef<HTMLDivElement>(null)

	const overlayRef = useRef<HTMLButtonElement>(null)

	const emptyId = useId()

	const invalid = control?.severity === 'error' || undefined

	// The `filled` value that the last event can make, when focus was in the
	// zone at that event. Otherwise `null`.
	const refocusRef = useRef<boolean | null>(null)

	// Each event that can swap the state first notes if focus is in the zone,
	// and the state that the event can make. The hidden input is outside the
	// zone, but the native picker leaves focus on the control that opened it.
	const noteFocus = (next: boolean) => {
		const zone = filledRef.current ?? emptyRef.current

		refocusRef.current = zone?.contains(document.activeElement) ? next : null
	}

	const handlePickChange = (event: ChangeEvent<HTMLInputElement>) => {
		noteFocus(children == null)

		handleChange(event)
	}

	const handleZoneDrop = (event: DragEvent) => {
		noteFocus(children == null)

		handleDrop(event)
	}

	const handleClear = () => {
		noteFocus(false)

		clearFiles()
	}

	const dragProps = {
		'data-drag-over': dataAttr(dragOver),
		onDragOver: handleDragOver,
		onDragEnter: handleDragEnter,
		onDragLeave: handleDragLeave,
		onDrop: handleZoneDrop,
	}

	// The swap unmounts the focused control. Focus then moves to the control
	// that replaces it, not to the page. A note from an event that kept the
	// state (a re-pick, or a drop with no accepted file) does not match a later
	// swap from `children`, so that swap leaves focus alone.
	useEffect(() => {
		const expected = refocusRef.current

		refocusRef.current = null

		if (expected !== filled) return

		const target = filled ? overlayRef.current : emptyRef.current

		target?.focus()
	}, [filled])

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
				onChange={handlePickChange}
			/>
			{filled ? (
				<div
					ref={filledRef}
					data-slot="file-upload"
					data-disabled={dataAttr(disabled)}
					className={cn(k.dropzone, 'relative h-40 w-full', className)}
					{...dragProps}
				>
					<DropSelection
						files={files}
						multiple={multiple}
						disabled={disabled}
						labelledBy={control?.labelledBy}
						invalid={invalid}
						alwaysTooltip={showTooltip}
						overlayRef={overlayRef}
						onPick={openPicker}
						onClear={handleClear}
					/>
				</div>
			) : (
				<button
					ref={emptyRef}
					id={emptyId}
					type="button"
					data-slot="file-upload"
					// The self-reference adds the content of the button to the name.
					aria-labelledby={control?.labelledBy ? `${control.labelledBy} ${emptyId}` : undefined}
					disabled={disabled}
					{...invalidAttrs(invalid)}
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

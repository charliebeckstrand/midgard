'use client'

import { type ComponentProps, type ReactNode, useId, useRef } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { invalidAttrs } from '../../core/invalid-attrs'
import { Upload } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import type { scale as buttonScale } from '../../recipes/kata/button'
import { k } from '../../recipes/kata/file-upload'
import { Button } from '../button'
import { lockedProps } from '../button/button-constants'
import { Icon } from '../icon'
import { FileUploadHiddenInput } from './file-upload-hidden-input'
import { fileUploadMessages } from './file-upload-messages'
import { triggerLabel } from './file-upload-utilities'
import type { FileUploadSharedProps } from './types'
import { splitProps, useFileUploadState } from './use-file-upload-state'

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

/**
 * File picker rendered as a button over a hidden `<input type="file">`.
 *
 * @remarks
 * Shares every internal with {@link FileUploadDrop}. Once a selection exists a
 * clear button joins the trigger, so another file can be selected or the
 * selection cleared without the trigger swapping out. The clear button gives
 * focus back to the trigger.
 *
 * The trigger takes the `aria-describedby` of the enclosing `<Control>` /
 * `<Field>`, so its Description and its error Message reach the focus. In a
 * Field with a Label, the name of the trigger is the Label and then its own
 * text, through `aria-labelledby`.
 *
 * @see {@link FileUploadDrop} · {@link FileUploadInput}
 */
export function FileUploadButton(allProps: FileUploadButtonProps) {
	const intl = useIntl()

	const { shared, rest } = splitProps(allProps)

	const { className, children, size, color, variant, ...props } = rest

	const state = useFileUploadState(shared)

	const { control, disabled, readOnly, invalid, files, hasFiles, openPicker, clearFiles } = state

	// A read-only field keeps the focus on each of its buttons, and they open
	// no picker and clear nothing.
	const inert = readOnly && lockedProps

	const triggerRef = useRef<HTMLButtonElement>(null)

	const triggerId = useId()

	const focusTrigger = () => triggerRef.current?.focus()

	const handleClear = () => {
		clearFiles()

		// Moves focus to the trigger once the clear button unmounts (WCAG 2.4.3).
		focusTrigger()
	}

	// The upload trigger always stays; a selection adds a clear button beside it, so a
	// different file can be picked (or the selection cleared) without the
	// trigger swapping out.
	return (
		<div data-slot="file-upload" {...props} className={cn(k.button, className)}>
			<FileUploadHiddenInput
				{...state.hiddenInput}
				ariaLabel={triggerLabel(children, intl.formatMessage(fileUploadMessages.upload))}
				forwardFocus={focusTrigger}
			/>
			<Button
				ref={triggerRef}
				id={triggerId}
				// The self-reference adds the text of the trigger to the Field Label.
				aria-labelledby={control?.labelledBy ? `${control.labelledBy} ${triggerId}` : undefined}
				aria-describedby={control?.describedBy}
				{...invalidAttrs(invalid)}
				type="button"
				size={size}
				color={color}
				variant={variant}
				disabled={disabled}
				onClick={openPicker}
				{...inert}
			>
				<Icon icon={<Upload />} />
				{children ?? intl.formatMessage(fileUploadMessages.upload)}
			</Button>
			{hasFiles && (
				<Button
					type="button"
					size={size}
					variant="soft"
					color="red"
					disabled={disabled}
					onClick={handleClear}
					{...inert}
				>
					{intl.formatMessage(fileUploadMessages.clear, { count: files.length })}
				</Button>
			)}
		</div>
	)
}

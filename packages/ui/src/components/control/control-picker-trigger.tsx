'use client'

import { type KeyboardEvent, type ReactNode, type RefObject, useRef } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import type { ValidationAttrs } from '../../core/validation-attrs'
import { SelectTrigger, type SelectTriggerProps } from '../../primitives/select-trigger'
import { HeadlessProvider } from '../../providers/headless'
import { Button } from '../button'
import { useControlFallbackLabel } from './use-control-fallback-label'

/**
 * The part of the state of a popover picker that {@link ControlPickerTrigger}
 * reads. The state hook of each picker returns it, so a picker passes its state
 * whole.
 *
 * @internal
 */
export type ControlPickerTriggerState = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	/** The id of the dialog panel. The trigger names it in `aria-controls` while open. */
	dialogId?: string
	describedBy?: string
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	/** Sets the native `disabled` attribute. */
	disabled?: boolean
	/**
	 * Sets `aria-readonly` and `data-readonly`. The trigger stays focusable, and
	 * the open setter of the picker refuses the open.
	 */
	readOnly?: boolean
	/** Sets `aria-required`. */
	required?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	/** The keys of the closed trigger. */
	onTriggerKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

type ControlPickerTriggerProps = {
	/** The state of the picker. */
	state: ControlPickerTriggerState
	/** The slots of the kata of the picker. `field` is the class of the button. */
	slots: SelectTriggerProps['slots'] & { readonly field: string }
	/**
	 * The density step of the picker. Omit it to take the step of the nearest
	 * density scope. A step makes the trigger a density scope.
	 */
	size?: SelectTriggerProps['size']
	/** The name of the trigger when no Field label or native label names it. */
	label: string
	/** The `data-slot` of the button. */
	'data-slot': string
	/** The content of the suffix slot, outside the button. */
	suffix?: ReactNode
	/** The button node. The trigger uses its own ref when this is omitted. */
	buttonRef?: RefObject<HTMLButtonElement | null>
	className?: string
	/** The content of the button: the value and the icon of the picker. */
	children: ReactNode
}

/**
 * The trigger of a popover picker, which DatePicker and ColorPicker share: a
 * Control-framed button that opens the dialog of the picker.
 *
 * @remarks The button has `role="combobox"`, as on Listbox. A select-only
 * combobox takes its value from its content, so a screen reader announces the
 * value after the name. The role also makes `aria-readonly` and
 * `aria-required` valid. A Label of the enclosing Field names the trigger
 * through its `for`. Only where no label names it does the trigger take the
 * name `label` (WCAG 4.1.2). A read-only trigger keeps its tab stop, so a
 * keyboard or a screen reader can reach it and read the value. Only `disabled`
 * sets the native `disabled` attribute.
 * @internal
 */
export function ControlPickerTrigger({
	state,
	slots,
	size,
	label,
	'data-slot': slot,
	suffix,
	buttonRef,
	className,
	children,
}: ControlPickerTriggerProps) {
	const {
		open,
		onOpenChange,
		triggerId,
		dialogId,
		describedBy,
		setReference,
		getReferenceProps,
		disabled = false,
		readOnly = false,
		required = false,
		validation,
		onTriggerKeyDown,
	} = state

	const ownRef = useRef<HTMLButtonElement>(null)

	const ref = buttonRef ?? ownRef

	const fallbackLabel = useControlFallbackLabel(label, ref)

	return (
		// An explicit `size` makes the trigger a density scope. Without it, the
		// stepped classes of the control bridge take the step of the nearest scope.
		<SelectTrigger
			open={open}
			setReference={setReference}
			getReferenceProps={getReferenceProps}
			slots={slots}
			size={size}
			className={className}
			suffix={suffix}
		>
			<HeadlessProvider>
				<Button
					ref={ref}
					type="button"
					id={triggerId}
					role="combobox"
					aria-label={fallbackLabel}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={open ? dialogId : undefined}
					aria-describedby={describedBy}
					aria-readonly={ariaAttr(readOnly)}
					aria-required={ariaAttr(required)}
					data-slot={slot}
					disabled={disabled}
					data-readonly={dataAttr(readOnly)}
					data-open={dataAttr(open)}
					data-disabled={dataAttr(disabled)}
					{...validation}
					onClick={() => onOpenChange(!open)}
					onKeyDown={onTriggerKeyDown}
					className={cn(slots.field)}
				>
					{children}
				</Button>
			</HeadlessProvider>
		</SelectTrigger>
	)
}

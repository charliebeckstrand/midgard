'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import { ariaAttr, cn, dataAttr, type ValidationAttrs } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useTruncation } from '../../hooks'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import { HeadlessProvider } from '../../providers/headless'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import { Button } from '../button'
import { Icon } from '../icon'
import { SelectionClearButton } from '../input/input-clear-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/**
 * The part of the state of a {@link DatePicker} variant that {@link DatePickerTrigger}
 * reads. Each variant state hook returns it, so a variant passes its state whole.
 *
 * @internal
 */
export type DatePickerTriggerState = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	/** The id of the dialog panel. The trigger names it in `aria-controls` while open. */
	dialogId?: string
	describedBy?: string
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	disabled?: boolean
	/**
	 * Marks the trigger with `aria-readonly` and `data-readonly`, as on Listbox.
	 * It also hides the clear button, because a read-only value cannot change.
	 */
	readOnly?: boolean
	required?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	onTriggerKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	/** Whether a value is set; gates the clear button alongside `clearable`. */
	hasValue?: boolean
	/** Clears the value; fired by the clear button. */
	onClear?: () => void
}

/** Props for {@link DatePickerTrigger}. @internal */
type DatePickerTriggerProps = {
	/** The state of the variant. */
	state: DatePickerTriggerState
	/** Text label for the selected value; ignored when `children` is provided. */
	displayValue?: string
	placeholder: string
	/**
	 * The density step of `<DatePicker>`. Omit it to take the step of the
	 * nearest density scope. A step makes the trigger a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** When `false`, the trigger grows to fit its content and omits the truncation Tooltip. */
	truncate?: boolean
	/**
	 * Custom value content rendered in place of the text label + truncation
	 * Tooltip (e.g. the relative variant's selection chips). The caller owns the
	 * empty/placeholder rendering and the `min-w-0 flex-1` layout.
	 */
	children?: ReactNode
	/** Renders a clear button in place of the calendar icon while the state `hasValue`. */
	clearable?: boolean
	/** Accessible name for the trigger when no Field label wraps it; the placeholder is not a programmatic name. */
	'aria-label'?: string
	className?: string
}

/**
 * Popover reference button showing the selected date label (or placeholder).
 * Carries the dialog ARIA wiring (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`, `aria-describedby`) and shows a Tooltip with the full label
 * when truncated. Pass `children` to render custom value content (the relative
 * variant's chips) in place of the text label.
 *
 * The button has `role="combobox"`, as on Listbox. A select-only combobox
 * takes its value from its content, so a screen reader announces the date
 * after an `aria-label` or a Field label. The role also makes `aria-readonly`
 * and `aria-required` valid.
 *
 * @internal
 */
export function DatePickerTrigger({
	state,
	displayValue = '',
	placeholder,
	size,
	'aria-label': ariaLabel,
	truncate = true,
	clearable = false,
	className,
	children,
}: DatePickerTriggerProps) {
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
		hasValue = false,
		onClear,
	} = state

	const glass = useGlass()

	const [valueRef, truncated] = useTruncation<HTMLSpanElement>()

	const buttonRef = useRef<HTMLButtonElement>(null)

	// Mirrors the Listbox/Combobox affordance: the clear button stands in for the
	// calendar icon while a value is set, clearing on click and returning focus
	// to the trigger as it unmounts (WCAG 2.4.3). A read-only value cannot
	// change, so the clear button does not show.
	const showClear = clearable && hasValue && !disabled && !readOnly

	const valueNode = (
		<span
			ref={valueRef}
			className={cn(k.value({ truncate }), truncate ? 'min-w-0 flex-1 overflow-hidden' : 'flex-1')}
		>
			{displayValue || <span className={cn(k.placeholder)}>{placeholder}</span>}
		</span>
	)

	return (
		// An explicit `size` makes the trigger a density scope. Without it, the
		// stepped classes of the control bridge take the step of the nearest scope.
		<SelectTrigger
			open={open}
			setReference={setReference}
			getReferenceProps={getReferenceProps}
			glass={glass}
			size={size}
			className={cn(k.root, className)}
			suffix={
				showClear ? (
					<SelectionClearButton
						onClear={() => {
							onClear?.()

							buttonRef.current?.focus()
						}}
					/>
				) : undefined
			}
		>
			<HeadlessProvider>
				<Button
					ref={buttonRef}
					type="button"
					id={triggerId}
					role="combobox"
					aria-label={ariaLabel}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={open ? dialogId : undefined}
					aria-describedby={describedBy}
					aria-readonly={ariaAttr(readOnly)}
					aria-required={ariaAttr(required)}
					data-slot="datepicker-button"
					disabled={disabled}
					data-readonly={dataAttr(readOnly)}
					data-open={dataAttr(open)}
					data-disabled={dataAttr(disabled)}
					{...validation}
					onClick={() => onOpenChange(!open)}
					onKeyDown={onTriggerKeyDown}
					className={cn(k.button())}
				>
					{/* With no value, the span shows the placeholder, and the tooltip has
					    nothing to reveal. */}
					{children ?? (
						<Tooltip disabled={!truncate || !truncated || !displayValue}>
							<TooltipTrigger>{valueNode}</TooltipTrigger>
							<TooltipContent>{displayValue}</TooltipContent>
						</Tooltip>
					)}
					{!showClear && (
						// A slot scope, so the icon is one step below the trigger.
						<span data-density="slot" className={cn(k.icon)}>
							<Icon icon={<CalendarIcon />} />
						</span>
					)}
				</Button>
			</HeadlessProvider>
		</SelectTrigger>
	)
}

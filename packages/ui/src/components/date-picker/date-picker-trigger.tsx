'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { useTruncation } from '../../hooks/use-truncation'
import { useIntl } from '../../primitives/intl/use-intl'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import {
	ControlPickerTrigger,
	type ControlPickerTriggerState,
} from '../control/control-picker-trigger'
import { useControlSurface } from '../control/use-control-surface'
import { dateInputMessages } from '../date-input/date-input-messages'
import { DateTimePending } from '../date-time/date-time-pending'
import { Icon } from '../icon'
import { SelectionClearButton } from '../input/input-clear-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/**
 * The part of the state of a {@link DatePicker} variant that {@link DatePickerTrigger}
 * reads. Each variant state hook returns it, so a variant passes its state whole.
 *
 * @internal
 */
export type DatePickerTriggerState = ControlPickerTriggerState & {
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
	/**
	 * Whether `displayValue` is the text of its skeleton. The text of `Intl`
	 * waits for hydration, as in `Calendar`, so the trigger shows a skeleton of
	 * the label until then.
	 */
	pending?: boolean
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
 * It is a {@link ControlPickerTrigger}, so it carries the combobox and dialog
 * ARIA of each picker. It shows a Tooltip with the full label when truncated.
 * Pass `children` to render custom value content (the relative variant's
 * chips) in place of the text label. With no Field label and no `aria-label`,
 * the trigger takes the name "Date".
 *
 * @internal
 */
export function DatePickerTrigger({
	state,
	displayValue = '',
	pending = false,
	placeholder,
	size,
	'aria-label': ariaLabel,
	truncate = true,
	clearable = false,
	className,
	children,
}: DatePickerTriggerProps) {
	const { disabled = false, readOnly = false, hasValue = false, onClear } = state

	const slots = k({ variant: useControlSurface() })

	const [valueRef, truncated] = useTruncation<HTMLSpanElement>()

	// The clear button gives the focus back to the trigger.
	const buttonRef = useRef<HTMLButtonElement>(null)

	const intl = useIntl()

	// Mirrors the Listbox/Combobox affordance: the clear button stands in for the
	// calendar icon while a value is set, clearing on click and returning focus
	// to the trigger as it unmounts (WCAG 2.4.3). A read-only value cannot
	// change, so the clear button does not show.
	const showClear = clearable && hasValue && !disabled && !readOnly

	// A label that waits for hydration shows as pending.
	const label = pending ? <DateTimePending>{displayValue}</DateTimePending> : displayValue

	const valueNode = (
		<span ref={valueRef} className={k({ truncate }).value}>
			{displayValue === '' ? <span className={cn(k.placeholder)}>{placeholder}</span> : label}
		</span>
	)

	return (
		<ControlPickerTrigger
			state={state}
			slots={slots}
			size={size}
			// A combobox takes no name from its content, so a trigger with no label
			// takes the name "Date", as `DateInput` does.
			label={ariaLabel ?? intl.formatMessage(dateInputMessages.name)}
			data-slot="datepicker-button"
			buttonRef={buttonRef}
			className={className}
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
					<Icon icon={CalendarIcon} />
				</span>
			)}
		</ControlPickerTrigger>
	)
}

'use client'

import type { Placement } from '@floating-ui/react'
import { useEffect, useRef, useState } from 'react'
import { useDensity } from '../../primitives/density'
import { Calendar } from '../calendar'
import type { ControlSize } from '../control/context'
import { DateInput, type DateInputFormat } from '../date-input'
import { formatDateValue } from '../date-input/date-input-utilities'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerInputToggle } from './date-picker-input-toggle'
import { DatePickerRange } from './date-picker-range'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerState } from './use-date-picker-state'

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onValueChange?: (value: Date | undefined) => void
	/**
	 * Shows a suffix toggle that swaps the popover trigger for a DateInput,
	 * letting the user type the date in place. While set, the trigger label
	 * renders through `format` instead of the locale string, so both modes
	 * read identically.
	 */
	input?: boolean
	/** Pattern for the typed date, and for the trigger label while `input` is set. @default 'MM/DD/YYYY' */
	format?: DateInputFormat
}

export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onValueChange?: (value: [Date, Date] | undefined) => void
}

export type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	/**
	 * Size step that drives trigger padding, text size, and the calendar icon.
	 * Resolution order: explicit prop, then `<Control>`, then enclosing Density size, then `'md'`.
	 */
	size?: ControlSize
	/**
	 * Truncates the displayed date label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content, e.g. inside a
	 * `<Group>` or another content-sized parent that collapses the label.
	 * @default true
	 */
	truncate?: boolean
	className?: string
	disabled?: boolean
	/** Accessible name for the trigger when no Field/Label wraps the picker. */
	'aria-label'?: string
	'data-group'?: string
	'data-group-orientation'?: string
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

/**
 * Popover date picker wrapping a Calendar; switches between single and range
 * selection on the `range` prop, and supports controlled or uncontrolled `value`.
 * `size` resolves through the explicit prop, then `<Control>`, then Density, then `'md'`.
 * With `input`, a suffix toggle swaps the trigger for a typed DateInput.
 */
export function DatePicker(props: DatePickerProps) {
	const inherited = useDensity()

	const resolvedSize: ControlSize = props.size ?? inherited.size

	if (props.range) {
		return <DatePickerRange {...props} size={resolvedSize} />
	}

	return <DatePickerSingle {...props} size={resolvedSize} />
}

function DatePickerSingle(props: DatePickerBaseProps & DatePickerSingleProps) {
	const {
		placeholder = 'Select a date',
		size = 'md',
		truncate = true,
		input = false,
		format = 'MM/DD/YYYY',
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerState(props)

	const [typing, setTyping] = useState(false)

	const wasTyping = useRef(false)

	// Refocus the trigger when leaving input mode; the toggle that held focus
	// re-mounts inside the new frame. Entering needs no counterpart: the
	// DateInput autofocuses.
	useEffect(() => {
		if (wasTyping.current && !typing) document.getElementById(state.triggerId)?.focus()

		wasTyping.current = typing
	}, [typing, state.triggerId])

	const toggle = input ? (
		<DatePickerInputToggle
			pressed={typing}
			disabled={state.disabled}
			onToggle={() => {
				if (!typing) state.onOpenChange(false)

				setTyping(!typing)
			}}
		/>
	) : undefined

	if (input && typing) {
		return (
			<DateInput
				data-slot="datepicker-input"
				autoFocus
				value={state.value ?? null}
				onValueChange={state.setValue}
				format={format}
				min={props.min}
				max={props.max}
				size={size}
				disabled={state.disabled}
				placeholder={props.placeholder}
				aria-label={ariaLabel}
				suffix={toggle}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
		)
	}

	// In input mode the trigger reads through the same format the DateInput
	// writes, so toggling does not change the text.
	const displayValue =
		input && state.value ? formatDateValue(state.value, format) : state.displayValue

	return (
		<div className="contents">
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={displayValue}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				required={state.required}
				invalid={state.invalid}
				onKeyDown={state.onTriggerKeyDown}
				suffix={toggle}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			<DatePickerContent
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				context={state.context}
				size={size}
				onKeyDown={state.onTriggerKeyDown}
			>
				<Calendar
					ref={state.calendar.calendarRef}
					value={state.calendar.value}
					onValueChange={state.calendar.onValueChange}
					min={props.min}
					max={props.max}
					active={state.calendar.active}
					footerRef={state.calendar.footerRef}
				/>
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</div>
	)
}

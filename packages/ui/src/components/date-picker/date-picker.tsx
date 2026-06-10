'use client'

import type { Placement } from '@floating-ui/react'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { Calendar } from '../calendar'
import type { ControlSize } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerRange } from './date-picker-range'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerState } from './use-date-picker-state'

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onValueChange?: (value: Date | undefined) => void
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
	 * Truncate the displayed date label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content — useful inside a
	 * `<Group>` or any other content-sized parent that would otherwise collapse
	 * the label. @default true
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
 * Popover date picker wrapping a Calendar — switches between single and range
 * selection on the `range` prop, and supports controlled or uncontrolled `value`.
 * `size` resolves through the explicit prop, then `<Control>`, then Density, then `'md'`.
 */
export function DatePicker(props: DatePickerProps) {
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const resolvedSize: ControlSize = props.size ?? inherited.size

	if (skeleton) {
		return <ControlSkeleton size={props.size} className={props.className} />
	}

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
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerState(props)

	return (
		<div className="contents">
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				required={state.required}
				invalid={state.invalid}
				onKeyDown={state.onTriggerKeyDown}
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

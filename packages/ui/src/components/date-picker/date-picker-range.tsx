'use client'

import { CalendarRange } from '../calendar'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerRangeState } from './use-date-picker-range-state'

export function DatePickerRange(props: DatePickerBaseProps & DatePickerRangeProps) {
	const {
		placeholder = 'Select dates',
		size = 'md',
		truncate = true,
		className,
		disabled = false,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerRangeState(props)

	return (
		<div className="contents">
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				triggerRef={state.triggerRef}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				disabled={disabled}
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
				onExitComplete={state.onExitComplete}
			>
				<CalendarRange
					ref={state.calendar.calendarRef}
					onValueChange={state.calendar.onValueChange}
					min={props.min}
					max={props.max}
					rangeStart={state.calendar.rangeStart}
					rangeEnd={state.calendar.rangeEnd}
					hoverDate={state.calendar.hoverDate}
					onHoverDate={state.calendar.onHoverDate}
					active={state.calendar.active}
					footerRef={state.calendar.footerRef}
				/>
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</div>
	)
}

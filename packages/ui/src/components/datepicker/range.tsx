'use client'

import { CalendarRange } from '../calendar'
import { DatePickerContent } from './content'
import { DatePickerFooter } from './footer'
import { DatePickerTrigger } from './trigger'
import type { DatePickerBaseProps, DatePickerRangeProps } from './types'
import { useDatePickerRangeState } from './use-range-state'

export function DatePickerRange(props: DatePickerBaseProps & DatePickerRangeProps) {
	const { placeholder = 'Select dates', className, disabled = false } = props

	const state = useDatePickerRangeState(props)

	return (
		<>
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder}
				disabled={disabled}
				onKeyDown={state.onTriggerKeyDown}
				className={className}
			/>
			<DatePickerContent
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				focusTrapRef={state.focusTrapRef}
				onExitComplete={state.onExitComplete}
			>
				<CalendarRange
					ref={state.calendar.calendarRef}
					onChange={state.calendar.onChange}
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
		</>
	)
}

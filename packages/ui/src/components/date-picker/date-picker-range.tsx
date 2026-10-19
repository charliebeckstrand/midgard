'use client'

import { useIntl } from '../../primitives/intl/use-intl'
import { CalendarRange } from '../calendar'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { DatePickerContent, useDatePickerSheet } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { datePickerMessages } from './date-picker-messages'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerRangeState } from './use-date-picker-range-state'

/**
 * Range variant of {@link DatePicker}: a `CalendarRange` in the popover with a
 * two-tap start/end selection, committing `[Date, Date]`. Rendered by
 * `DatePicker` when `range` is set.
 *
 * @internal
 */
export function DatePickerRange(props: DatePickerBaseProps & DatePickerRangeProps) {
	const {
		placeholder,
		size,
		truncate = true,
		clearable = false,
		className,
		'aria-label': ariaLabel,
	} = props

	const {
		calendar: { calendarRef, ...calendar },
		footer,
		...state
	} = useDatePickerRangeState(props)

	const sheet = useDatePickerSheet(props.sheet)

	const intl = useIntl()

	return (
		<>
			<DatePickerTrigger
				state={state}
				displayValue={state.displayValue}
				placeholder={placeholder ?? intl.formatMessage(datePickerMessages.selectDates)}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				clearable={clearable}
				className={className}
			/>
			<DatePickerContent
				state={state}
				size={size}
				sheet={sheet}
				footer={<DatePickerFooter {...footer} />}
				onKeyDown={state.onTriggerKeyDown}
			>
				<CalendarRange
					ref={calendarRef}
					onValueChange={calendar.onValueChange}
					min={props.min}
					max={props.max}
					rangeStart={calendar.rangeStart}
					rangeEnd={calendar.rangeEnd}
					hoverDate={calendar.hoverDate}
					onHoverDate={calendar.onHoverDate}
					onMonthChange={props.onMonthChange}
					active={calendar.active}
				/>
			</DatePickerContent>
		</>
	)
}

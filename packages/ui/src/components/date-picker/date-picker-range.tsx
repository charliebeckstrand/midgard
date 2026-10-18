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
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				dialogId={state.dialogId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder ?? intl.formatMessage(datePickerMessages.selectDates)}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				readOnly={state.readOnly}
				required={state.required}
				validation={state.validation}
				onKeyDown={state.onTriggerKeyDown}
				clearable={clearable}
				hasValue={state.hasValue}
				onClear={state.onClear}
				className={className}
			/>
			<DatePickerContent
				id={state.dialogId}
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				context={state.context}
				size={size}
				sheet={sheet}
				footer={<DatePickerFooter {...footer} />}
				onKeyDown={state.onTriggerKeyDown}
				onExitComplete={state.onExitComplete}
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

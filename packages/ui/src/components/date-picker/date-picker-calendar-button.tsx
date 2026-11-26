'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { dataAttr } from '../../core/data-attr'
import { useIntl } from '../../primitives/intl/use-intl'
import { IconButton } from '../icon-button'
import { datePickerMessages } from './date-picker-messages'

/** Props for {@link DatePickerCalendarButton}. @internal */
type DatePickerCalendarButtonProps = {
	open: boolean
	disabled?: boolean
	/** Toggles the popover open/closed. */
	onActivate: () => void
}

/**
 * Calendar-icon suffix button that toggles an `input`-enabled picker's popover;
 * its label and tooltip track the open state ("Open" / "Close calendar").
 *
 * @internal
 */
export function DatePickerCalendarButton({
	open,
	disabled,
	onActivate,
}: DatePickerCalendarButtonProps) {
	const intl = useIntl()

	const label = intl.formatMessage(
		open ? datePickerMessages.closeCalendar : datePickerMessages.openCalendar,
	)

	return (
		<IconButton
			aria-label={label}
			icon={CalendarIcon}
			aria-haspopup="dialog"
			aria-expanded={open}
			disabled={disabled}
			data-open={dataAttr(open)}
			// Keep focus on the input: a blur here would run the field's
			// commit-on-blur over a partial entry before the calendar opens.
			onMouseDown={(event) => event.preventDefault()}
			onClick={onActivate}
		/>
	)
}

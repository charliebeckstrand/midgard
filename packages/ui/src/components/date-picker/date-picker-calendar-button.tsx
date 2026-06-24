'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

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
	const label = open ? 'Close calendar' : 'Open calendar'

	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					aria-label={label}
					aria-haspopup="dialog"
					aria-expanded={open}
					disabled={disabled}
					onClick={onActivate}
				>
					<Icon icon={<CalendarIcon />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

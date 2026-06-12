'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import type { FocusEventHandler, MouseEventHandler } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type DatePickerCalendarButtonProps = {
	open?: boolean
	disabled?: boolean
	onActivate: () => void
	onMouseDown?: MouseEventHandler<HTMLButtonElement>
	onBlur?: FocusEventHandler<HTMLButtonElement>
}

/**
 * The calendar-icon suffix button an `input`-enabled picker renders in both
 * modes: on the trigger it opens the popover; on the DateInput it leaves
 * input mode and opens the popover in one press.
 */
export function DatePickerCalendarButton({
	open = false,
	disabled,
	onActivate,
	onMouseDown,
	onBlur,
}: DatePickerCalendarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					aria-label="Open the calendar"
					aria-haspopup="dialog"
					aria-expanded={open}
					disabled={disabled}
					onMouseDown={onMouseDown}
					onClick={onActivate}
					onBlur={onBlur}
				>
					<Icon icon={<CalendarIcon />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Open the calendar</TooltipContent>
		</Tooltip>
	)
}

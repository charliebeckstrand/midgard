'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type DatePickerCalendarButtonProps = {
	open: boolean
	disabled?: boolean
	onActivate: () => void
}

/** Calendar-icon suffix button that opens an `input`-enabled picker's popover. */
export function DatePickerCalendarButton({
	open,
	disabled,
	onActivate,
}: DatePickerCalendarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					aria-label="Open calendar"
					aria-haspopup="dialog"
					aria-expanded={open}
					disabled={disabled}
					onClick={onActivate}
				>
					<Icon icon={<CalendarIcon />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Open calendar</TooltipContent>
		</Tooltip>
	)
}

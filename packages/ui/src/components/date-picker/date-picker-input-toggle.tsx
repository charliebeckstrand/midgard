'use client'

import { Calendar as CalendarIcon, TextCursorInput } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type DatePickerInputToggleProps = {
	pressed: boolean
	onToggle: () => void
	disabled?: boolean
}

/**
 * Suffix toggle between the popover trigger and the typed DateInput.
 * Fixed accessible name + aria-pressed (the APG toggle pattern): screen
 * readers do not reliably announce a name swap on the same control. The
 * visible tooltip still swaps.
 */
export function DatePickerInputToggle({ pressed, onToggle, disabled }: DatePickerInputToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					aria-label="Type the date"
					aria-pressed={pressed}
					disabled={disabled}
					onClick={onToggle}
				>
					<Icon icon={pressed ? <CalendarIcon /> : <TextCursorInput />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{pressed ? 'Pick from the calendar' : 'Type the date'}</TooltipContent>
		</Tooltip>
	)
}

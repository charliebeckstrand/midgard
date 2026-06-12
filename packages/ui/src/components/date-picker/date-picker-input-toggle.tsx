'use client'

import { TextCursorInput } from 'lucide-react'
import type { FocusEventHandler } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type DatePickerInputToggleProps = {
	pressed: boolean
	onToggle: () => void
	disabled?: boolean
	onBlur?: FocusEventHandler<HTMLButtonElement>
}

/**
 * Suffix toggle between the popover trigger and the typed DateInput.
 * Fixed accessible name + aria-pressed (the APG toggle pattern): screen
 * readers do not reliably announce a name swap on the same control. The
 * visible tooltip still swaps.
 */
export function DatePickerInputToggle({
	pressed,
	onToggle,
	disabled,
	onBlur,
}: DatePickerInputToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					aria-label="Type the date"
					aria-pressed={pressed}
					disabled={disabled}
					// The press keeps focus in place: focus moving off the DateInput
					// would leave input mode before the click lands.
					onMouseDown={(event) => event.preventDefault()}
					onClick={onToggle}
					onBlur={onBlur}
				>
					<Icon icon={<TextCursorInput />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{pressed ? 'Stop typing the date' : 'Type the date'}</TooltipContent>
		</Tooltip>
	)
}

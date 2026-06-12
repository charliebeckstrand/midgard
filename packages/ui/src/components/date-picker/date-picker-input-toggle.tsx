'use client'

import { TextCursorInput } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type DatePickerInputToggleProps = {
	onActivate: () => void
	disabled?: boolean
}

/**
 * Suffix button that switches the picker into typed input mode. It does not
 * render while the DateInput is active; leaving the input re-shows it.
 */
export function DatePickerInputToggle({ onActivate, disabled }: DatePickerInputToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button variant="bare" aria-label="Type the date" disabled={disabled} onClick={onActivate}>
					<Icon icon={<TextCursorInput />} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Type the date</TooltipContent>
		</Tooltip>
	)
}

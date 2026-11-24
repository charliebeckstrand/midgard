import { Button } from 'ui/button'
import { useHasHover } from 'ui/hooks'
import { Tooltip, TooltipContent, TooltipGroup, TooltipTrigger } from 'ui/tooltip'

export default function InAGroup() {
	// A touch screen gives no hover, so the demo opens on a tap there.
	const trigger = useHasHover() ? 'hover' : 'click'

	// The first tooltip waits for the delay. While it is open, the next one opens at once.
	return (
		<TooltipGroup>
			<Tooltip delay={500} trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">Archive</Button>
				</TooltipTrigger>
				<TooltipContent>Move the message out of the inbox</TooltipContent>
			</Tooltip>
			<Tooltip delay={500} trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">Snooze</Button>
				</TooltipTrigger>
				<TooltipContent>Show the message again tomorrow</TooltipContent>
			</Tooltip>
			<Tooltip delay={500} trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">Forward</Button>
				</TooltipTrigger>
				<TooltipContent>Send the message to another person</TooltipContent>
			</Tooltip>
		</TooltipGroup>
	)
}

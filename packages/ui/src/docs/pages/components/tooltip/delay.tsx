import { Button } from 'ui/button'
import { useHasHover } from 'ui/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function Delay() {
	// A touch screen gives no hover, so the demo opens on a tap there.
	const trigger = useHasHover() ? 'hover' : 'click'

	return (
		<>
			<Tooltip delay={0} trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">No delay</Button>
				</TooltipTrigger>
				<TooltipContent>This tooltip opens at once.</TooltipContent>
			</Tooltip>
			<Tooltip delay={1000} trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">One second</Button>
				</TooltipTrigger>
				<TooltipContent>This tooltip opens after 1000 ms.</TooltipContent>
			</Tooltip>
		</>
	)
}

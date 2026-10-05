import { Button } from 'ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function Delay() {
	return (
		<>
			<Tooltip delay={0}>
				<TooltipTrigger>
					<Button variant="outline">No delay</Button>
				</TooltipTrigger>
				<TooltipContent>This tooltip opens at once.</TooltipContent>
			</Tooltip>
			<Tooltip delay={1000}>
				<TooltipTrigger>
					<Button variant="outline">One second</Button>
				</TooltipTrigger>
				<TooltipContent>This tooltip opens after 1000 ms.</TooltipContent>
			</Tooltip>
		</>
	)
}

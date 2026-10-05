import { Button } from 'ui/button'
import { Tooltip, TooltipContent, type TooltipProps, TooltipTrigger } from 'ui/tooltip'

export default function TooltipPlayground(props: TooltipProps) {
	return (
		<Tooltip {...props}>
			<TooltipTrigger>
				<Button variant="outline">Publish</Button>
			</TooltipTrigger>
			<TooltipContent>Make the page visible to everyone with the link.</TooltipContent>
		</Tooltip>
	)
}

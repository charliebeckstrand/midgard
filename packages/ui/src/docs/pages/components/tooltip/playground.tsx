import { Button } from 'ui/button'
import { useHasHover } from 'ui/hooks'
import { Tooltip, TooltipContent, type TooltipProps, TooltipTrigger } from 'ui/tooltip'

export default function TooltipPlayground(props: TooltipProps) {
	// A touch screen gives no hover, so the demo opens on a tap there.
	const hasHover = useHasHover()

	return (
		<Tooltip {...props} trigger={hasHover ? props.trigger : 'click'}>
			<TooltipTrigger>
				<Button variant="outline">Publish</Button>
			</TooltipTrigger>
			<TooltipContent>Make the page visible to everyone with the link.</TooltipContent>
		</Tooltip>
	)
}

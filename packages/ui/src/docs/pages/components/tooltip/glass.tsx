import { Button } from 'ui/button'
import { useHasHover } from 'ui/hooks'
import { GlassProvider } from 'ui/providers/glass'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function Glass() {
	// A touch screen gives no hover, so the demo opens on a tap there.
	const trigger = useHasHover() ? 'hover' : 'click'

	return (
		<GlassProvider>
			<Tooltip trigger={trigger}>
				<TooltipTrigger>
					<Button variant="outline">Publish</Button>
				</TooltipTrigger>
				<TooltipContent>Make the page visible to everyone with the link.</TooltipContent>
			</Tooltip>
		</GlassProvider>
	)
}

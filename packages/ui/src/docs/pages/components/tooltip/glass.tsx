import { Button } from 'ui/button'
import { GlassProvider } from 'ui/providers/glass'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function Glass() {
	return (
		<GlassProvider>
			<Tooltip>
				<TooltipTrigger>
					<Button variant="outline">Publish</Button>
				</TooltipTrigger>
				<TooltipContent>Make the page visible to everyone with the link.</TooltipContent>
			</Tooltip>
		</GlassProvider>
	)
}

import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function InteractiveContent() {
	return (
		<Tooltip interactive>
			<TooltipTrigger>
				<Button variant="outline">Save draft</Button>
			</TooltipTrigger>
			<TooltipContent>
				<Flex align="center" gap="sm">
					Draft saved.
					<Button size="sm" variant="outline">
						Undo
					</Button>
				</Flex>
			</TooltipContent>
		</Tooltip>
	)
}

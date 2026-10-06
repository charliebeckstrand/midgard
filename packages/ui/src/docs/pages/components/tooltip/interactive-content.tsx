import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { useHasHover } from 'ui/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function InteractiveContent() {
	// A touch screen gives no hover, so the demo opens on a tap there.
	const trigger = useHasHover() ? 'hover' : 'click'

	return (
		<Tooltip interactive trigger={trigger}>
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

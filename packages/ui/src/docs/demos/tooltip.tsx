import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

const placements = ['left', 'top', 'bottom', 'right'] as const

export default function TooltipDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default">
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This is a tooltip</TooltipContent>
				</Tooltip>
			</Example>

			<Example title="Placement">
				<Flex wrap justify="center" gap={4} className="py-8">
					{placements.map((placement) => (
						<Tooltip key={placement} placement={placement}>
							<TooltipTrigger>
								<Button variant="outline">{placement}</Button>
							</TooltipTrigger>
							<TooltipContent>Tooltip on {placement}</TooltipContent>
						</Tooltip>
					))}
				</Flex>
			</Example>

			<Example title="Interactive">
				<Tooltip interactive>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This tooltip stays open when you hover over it.</TooltipContent>
				</Tooltip>
			</Example>
		</Stack>
	)
}

import { Example } from 'docs'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { GlassProvider } from '../../providers/glass'

const placements = ['left', 'top', 'bottom', 'right'] as const

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This is a tooltip</TooltipContent>
				</Tooltip>
			</Example>

			<Example title="Placement">
				<Flex wrap justify="center" gap="lg" className="py-8">
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

			<Example title="Delay">
				<Tooltip delay={1000}>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>
						This tooltip has a delay of 1000ms before it opens and closes.
					</TooltipContent>
				</Tooltip>
			</Example>

			<Example title="Glass">
				<GlassProvider>
					<Tooltip>
						<TooltipTrigger>
							<Button variant="outline">Hover me</Button>
						</TooltipTrigger>
						<TooltipContent>This tooltip has a glass surface.</TooltipContent>
					</Tooltip>
				</GlassProvider>
			</Example>
		</>
	)
}

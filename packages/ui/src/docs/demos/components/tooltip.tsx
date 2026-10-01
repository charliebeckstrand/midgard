import { Button } from '../../../components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Tooltip"
				captions={false}
				omit={['open']}
				render={(props, label) => (
					<Tooltip {...props}>
						<TooltipTrigger>
							<Button variant="outline">{label}</Button>
						</TooltipTrigger>

						<TooltipContent>This is a tooltip</TooltipContent>
					</Tooltip>
				)}
			/>

			<Axes
				of="TooltipContent"
				captions={false}
				title="Tooltip content"
				render={(props, label) => (
					<Tooltip>
						<TooltipTrigger>
							<Button variant="outline">{label}</Button>
						</TooltipTrigger>

						<TooltipContent {...props}>This is a tooltip</TooltipContent>
					</Tooltip>
				)}
			/>

			<Example title="Interactive with controls">
				<Tooltip interactive>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
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
			</Example>

			<Example title="Delay">
				<Tooltip delay={1000}>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This tooltip has a delay of 1000ms before it opens.</TooltipContent>
				</Tooltip>
			</Example>
		</>
	)
}

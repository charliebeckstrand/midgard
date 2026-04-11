import { Button } from '../../components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

const placements = ['left', 'top', 'bottom', 'right'] as const

export default function TooltipDemo() {
	return (
		<div className="space-y-8">
			<Example title="Basic">
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This is a tooltip</TooltipContent>
				</Tooltip>
			</Example>

			<Example title="Placement">
				<div className="flex flex-wrap items-center justify-center gap-4 py-8">
					{placements.map((placement) => (
						<Tooltip key={placement} placement={placement}>
							<TooltipTrigger>
								<Button variant="outline">{placement}</Button>
							</TooltipTrigger>
							<TooltipContent>Tooltip on {placement}</TooltipContent>
						</Tooltip>
					))}
				</div>
			</Example>

			<Example title="Interactive">
				<Tooltip interactive>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This tooltip stays open when you hover over it.</TooltipContent>
				</Tooltip>
			</Example>
		</div>
	)
}

import { Button } from '../../components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

const placements = ['top', 'bottom', 'left', 'right'] as const

export default function TooltipDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Basic"
				code={code`
					import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
					import { Button } from 'ui/button'

					<Tooltip>
						<TooltipTrigger>
							<Button variant="outline">Hover me</Button>
						</TooltipTrigger>
						<TooltipContent>This is a tooltip</TooltipContent>
					</Tooltip>
				`}
			>
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline">Hover me</Button>
					</TooltipTrigger>
					<TooltipContent>This is a tooltip</TooltipContent>
				</Tooltip>
			</Example>

			<Example
				title="Placement"
				code={code`
					import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
					import { Button } from 'ui/button'

					${placements.map((p) => `<Tooltip placement="${p}">\n  <TooltipTrigger>\n    <Button variant="outline">${p}</Button>\n  </TooltipTrigger>\n  <TooltipContent>Tooltip on ${p}</TooltipContent>\n</Tooltip>`)}
				`}
			>
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

			<Example
				title="Interactive"
				code={code`
					import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
					import { Button } from 'ui/button'

					<Tooltip interactive>
						<TooltipTrigger>
							<Button variant="outline">Hover me</Button>
						</TooltipTrigger>
						<TooltipContent>
							This tooltip stays open when you hover over it.
						</TooltipContent>
					</Tooltip>
				`}
			>
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

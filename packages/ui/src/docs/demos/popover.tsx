import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

const placements = ['left', 'top', 'bottom', 'right'] as const

const iconMap = {
	left: <ChevronLeft />,
	top: <ChevronUp />,
	bottom: <ChevronDown />,
	right: <ChevronRight />,
}

export default function PopoverDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<Popover>
					<PopoverTrigger>
						<Button variant="outline">
							Open popover
							<Icon icon={<ChevronDown />} />
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<p className="text-sm font-medium">Popover content</p>
						<p className="mt-1 text-sm text-zinc-500">
							This is a general-purpose floating container.
						</p>
					</PopoverContent>
				</Popover>
			</Example>

			<Example title="Placement">
				<div className="flex flex-wrap items-center justify-center gap-4 py-8">
					{placements.map((placement) => (
						<Popover key={placement} placement={placement}>
							<PopoverTrigger>
								<Button variant="outline">
									{(placement === 'left' || placement === 'top') && (
										<Icon icon={iconMap[placement]} />
									)}
									{placement}
									{(placement === 'right' || placement === 'bottom') && (
										<Icon icon={iconMap[placement]} />
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent>Popover on {placement}</PopoverContent>
						</Popover>
					))}
				</div>
			</Example>
		</div>
	)
}

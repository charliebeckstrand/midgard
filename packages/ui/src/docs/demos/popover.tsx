import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Glass } from '../../components/glass'
import { Icon } from '../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

const placements = ['left', 'top', 'bottom', 'right'] as const

const iconMap = {
	left: <ChevronLeft />,
	top: <ChevronUp />,
	bottom: <ChevronDown />,
	right: <ChevronRight />,
}

const popoverContent = (
	<>
		<p className="text-sm font-medium">Popover content</p>
		<p className="mt-1 text-sm text-zinc-500">This is a general-purpose floating container.</p>
	</>
)

export default function PopoverDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Popover>
					<PopoverTrigger>
						<Button variant="outline">
							Open popover
							<Icon icon={<ChevronDown />} />
						</Button>
					</PopoverTrigger>
					<PopoverContent>{popoverContent}</PopoverContent>
				</Popover>
			</Example>

			<Example title="Glass">
				<Glass>
					<Popover>
						<PopoverTrigger>
							<Button variant="outline">
								Open popover
								<Icon icon={<ChevronDown />} />
							</Button>
						</PopoverTrigger>
						<PopoverContent>{popoverContent}</PopoverContent>
					</Popover>
				</Glass>
			</Example>

			<Example title="Placement">
				<div>
					<Flex justify="center" gap={4} className="hidden sm:flex">
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
								<PopoverContent>Popover {placement}</PopoverContent>
							</Popover>
						))}
					</Flex>
					<Stack gap={4} className="sm:hidden">
						<Stack gap={4}>
							{(['right', 'bottom'] as const).map((placement) => (
								<Popover key={placement} placement={placement}>
									<PopoverTrigger>
										<Button variant="outline" className="self-start">
											{placement}
											<Icon icon={iconMap[placement]} />
										</Button>
									</PopoverTrigger>
									<PopoverContent>Popover {placement}</PopoverContent>
								</Popover>
							))}
						</Stack>
						<Stack gap={4} align="end">
							{(['top', 'left'] as const).map((placement) => (
								<Popover key={placement} placement={placement}>
									<PopoverTrigger>
										<Button variant="outline" className="self-end">
											<Icon icon={iconMap[placement]} />
											{placement}
										</Button>
									</PopoverTrigger>
									<PopoverContent>Popover {placement}</PopoverContent>
								</Popover>
							))}
						</Stack>
					</Stack>
				</div>
			</Example>
		</Stack>
	)
}

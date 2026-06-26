import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { GlassProvider } from '../../providers/glass'
import { Example } from '../engine'

const placements = ['left', 'top', 'bottom', 'right'] as const

const iconMap = {
	left: <ChevronLeft />,
	top: <ChevronUp />,
	bottom: <ChevronDown />,
	right: <ChevronRight />,
}

const popoverContent = (
	<>
		<Text>Popover content</Text>
		<Text severity="muted">This is a general-purpose floating container.</Text>
	</>
)

export function Demo() {
	return (
		<>
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

			<Example title="Placement">
				<div>
					<Flex justify="center" gap="lg" className="hidden sm:flex">
						{placements.map((placement) => {
							const isLeading = placement === 'left' || placement === 'top'

							const iconNode = <Icon icon={iconMap[placement]} />

							return (
								<Popover key={placement} placement={placement}>
									<PopoverTrigger>
										<Button
											variant="outline"
											prefix={isLeading ? iconNode : undefined}
											suffix={isLeading ? undefined : iconNode}
										>
											{placement}
										</Button>
									</PopoverTrigger>
									<PopoverContent>Popover {placement}</PopoverContent>
								</Popover>
							)
						})}
					</Flex>
					<Stack gap="lg" className="sm:hidden">
						<Stack gap="lg">
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
						<Stack gap="lg" align="end">
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

			<Example title="Glass">
				<GlassProvider>
					<Popover>
						<PopoverTrigger>
							<Button variant="outline">
								Open popover
								<Icon icon={<ChevronDown />} />
							</Button>
						</PopoverTrigger>
						<PopoverContent>{popoverContent}</PopoverContent>
					</Popover>
				</GlassProvider>
			</Example>
		</>
	)
}

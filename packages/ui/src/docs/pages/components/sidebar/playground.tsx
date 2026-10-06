import { Aperture, ChartBar, House, Inbox, Users } from 'lucide-react'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	type SidebarProps,
	useSidebarMini,
} from 'ui/sidebar'

const items = [
	{ value: 'home', label: 'Home', icon: <House /> },
	{ value: 'inbox', label: 'Inbox', icon: <Inbox /> },
	{ value: 'team', label: 'Team', icon: <Users /> },
	{ value: 'reports', label: 'Reports', icon: <ChartBar /> },
]

function Brand() {
	const mini = useSidebarMini()

	if (!mini) return <Heading level={3}>Acme Inc.</Heading>

	return (
		<Flex flex="1" justify="center">
			<Icon icon={<Aperture />} size="lg" />
		</Flex>
	)
}

export default function SidebarPlayground(props: SidebarProps) {
	return (
		<div className="h-108 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
			<Sidebar aria-label="Acme Inc." {...props}>
				<SidebarHeader>
					<Brand />
				</SidebarHeader>
				<SidebarBody>
					<SidebarList aria-label="Main">
						{items.map((item) => (
							<SidebarItem key={item.value} icon={item.icon} current={item.value === 'home'}>
								<SidebarLabel>{item.label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarList>
				</SidebarBody>
			</Sidebar>
		</div>
	)
}

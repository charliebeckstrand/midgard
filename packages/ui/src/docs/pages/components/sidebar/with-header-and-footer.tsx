import { ChartBar, CircleUser, House, Inbox, Users } from 'lucide-react'
import { useState } from 'react'
import { Heading } from 'ui/heading'
import {
	Sidebar,
	SidebarBody,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from 'ui/sidebar'

const items = [
	{ value: 'home', label: 'Home', icon: <House /> },
	{ value: 'inbox', label: 'Inbox', icon: <Inbox /> },
	{ value: 'team', label: 'Team', icon: <Users /> },
	{ value: 'reports', label: 'Reports', icon: <ChartBar /> },
]

export default function WithHeaderAndFooter() {
	const [active, setActive] = useState('home')

	return (
		<Sidebar aria-label="Sidebar with header and footer">
			<SidebarHeader>
				<Heading level={3}>Acme Inc.</Heading>
			</SidebarHeader>
			<SidebarBody>
				<SidebarList aria-label="Main">
					{items.map((item) => (
						<SidebarItem
							key={item.value}
							icon={item.icon}
							current={active === item.value}
							onClick={() => setActive(item.value)}
						>
							<SidebarLabel>{item.label}</SidebarLabel>
						</SidebarItem>
					))}
				</SidebarList>
			</SidebarBody>
			<SidebarFooter>
				<SidebarItem icon={<CircleUser />}>
					<SidebarLabel>Wade Cooper</SidebarLabel>
				</SidebarItem>
			</SidebarFooter>
		</Sidebar>
	)
}

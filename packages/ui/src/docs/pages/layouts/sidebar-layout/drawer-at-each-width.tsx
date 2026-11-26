import { Inbox, Settings, Users } from 'lucide-react'
import { Heading } from 'ui/heading'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from 'ui/layouts'
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarSection } from 'ui/sidebar'
import { Text } from 'ui/text'

const navItems = [
	{ id: 'inbox', icon: <Inbox />, label: 'Inbox', current: true },
	{ id: 'team', icon: <Users />, label: 'Team' },
	{ id: 'settings', icon: <Settings />, label: 'Settings' },
]

// `layout="drawer"` keeps the sidebar in a drawer at each width. The navbar
// holds the menu button and `navbar`, and it sticks to the top as the page
// scrolls.
export default function DrawerAtEachWidth() {
	return (
		<SidebarLayout
			layout="drawer"
			navbar={<Text className="font-medium">Harbor Labs</Text>}
			sidebar={
				<Sidebar aria-label="Harbor Labs">
					<SidebarBody>
						<SidebarSection>
							{navItems.map((item) => (
								<SidebarItem key={item.id} icon={item.icon} current={item.current}>
									<SidebarLabel>{item.label}</SidebarLabel>
								</SidebarItem>
							))}
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			<SidebarLayoutHeader>
				<Heading level={2}>Inbox</Heading>
			</SidebarLayoutHeader>
			<SidebarLayoutBody>
				<Text>You have no new messages.</Text>
			</SidebarLayoutBody>
		</SidebarLayout>
	)
}

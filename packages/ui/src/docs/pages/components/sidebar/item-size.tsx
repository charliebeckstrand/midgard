import { House, Inbox, Users } from 'lucide-react'
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarList } from 'ui/sidebar'

export default function ItemSize() {
	return (
		<Sidebar aria-label="Sidebar item sizes">
			<SidebarBody>
				<SidebarList aria-label="Sizes">
					<SidebarItem size="sm" icon={<House />}>
						<SidebarLabel>Small</SidebarLabel>
					</SidebarItem>
					<SidebarItem size="md" icon={<Inbox />}>
						<SidebarLabel>Medium</SidebarLabel>
					</SidebarItem>
					<SidebarItem size="lg" icon={<Users />}>
						<SidebarLabel>Large</SidebarLabel>
					</SidebarItem>
				</SidebarList>
			</SidebarBody>
		</Sidebar>
	)
}

import { Inbox, Search } from 'lucide-react'
import { Badge } from 'ui/badge'
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarList } from 'ui/sidebar'

export default function WithSuffixSlot() {
	return (
		<Sidebar aria-label="Sidebar with suffixes">
			<SidebarBody>
				<SidebarList aria-label="Main">
					<SidebarItem
						icon={<Search />}
						preventClose
						suffix={
							<Badge color="zinc" size="md">
								⌘K
							</Badge>
						}
					>
						<SidebarLabel>Search</SidebarLabel>
					</SidebarItem>
					<SidebarItem
						icon={<Inbox />}
						suffix={
							<Badge color="blue" size="md">
								12
							</Badge>
						}
					>
						<SidebarLabel>Inbox</SidebarLabel>
					</SidebarItem>
				</SidebarList>
			</SidebarBody>
		</Sidebar>
	)
}

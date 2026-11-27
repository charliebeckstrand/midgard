import { ChevronDown, Inbox } from 'lucide-react'
import { IconButton } from 'ui/icon-button'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarList } from 'ui/sidebar'

export default function WithActions() {
	return (
		<Sidebar aria-label="Folders">
			<SidebarBody>
				<SidebarList aria-label="Main">
					<SidebarItem
						icon={<Inbox />}
						suffix={
							<Menu placement="bottom-end">
								<MenuTrigger>
									<IconButton aria-label="Inbox actions" icon={<ChevronDown />} />
								</MenuTrigger>
								<MenuContent>
									<MenuItem>
										<MenuLabel>Mark as read</MenuLabel>
									</MenuItem>
									<MenuItem>
										<MenuLabel>Move to folder</MenuLabel>
									</MenuItem>
									<MenuItem>
										<MenuLabel>Delete</MenuLabel>
									</MenuItem>
								</MenuContent>
							</Menu>
						}
					>
						<SidebarLabel>Inbox</SidebarLabel>
					</SidebarItem>
				</SidebarList>
			</SidebarBody>
		</Sidebar>
	)
}

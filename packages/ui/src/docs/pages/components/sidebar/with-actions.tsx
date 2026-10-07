import { ChevronDown, Inbox } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarList } from 'ui/sidebar'

export default function WithActions() {
	return (
		<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
			<Sidebar aria-label="Sidebar with actions">
				<SidebarBody>
					<SidebarList aria-label="Main">
						<SidebarItem
							icon={<Inbox />}
							suffix={
								<Menu placement="bottom-end">
									<MenuTrigger>
										<Button variant="bare" aria-label="Inbox actions">
											<Icon icon={<ChevronDown />} />
										</Button>
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
		</div>
	)
}

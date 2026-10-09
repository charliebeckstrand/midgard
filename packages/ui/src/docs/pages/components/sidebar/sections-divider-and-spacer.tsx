import { Cog, Folder, House, Inbox, LogOut, MessageCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	SidebarSection,
} from 'ui/sidebar'
import { Spacer } from 'ui/spacer'
import { Text } from 'ui/text'

const main = [
	{ value: 'home', label: 'Home', icon: <House /> },
	{ value: 'inbox', label: 'Inbox', icon: <Inbox /> },
]

const projects = [
	{ value: 'midgard', label: 'Midgard' },
	{ value: 'asgard', label: 'Asgard' },
	{ value: 'vanaheim', label: 'Vanaheim' },
]

const chats = [
	{ value: 'general', label: 'General' },
	{ value: 'random', label: 'Random' },
	{ value: 'design', label: 'Design' },
	{ value: 'development', label: 'Development' },
]

export default function SectionsDividerAndSpacer() {
	const [active, setActive] = useState('home')

	return (
		<Sidebar aria-label="Sidebar with sections">
			<SidebarHeader>
				<Heading level={3}>Workspace</Heading>
			</SidebarHeader>
			<SidebarBody>
				<SidebarList aria-label="Main">
					{main.map((item) => (
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

				<SidebarDivider />

				<SidebarSection>
					<Flex align="center" justify="between" gap="sm">
						<Text tone="muted" size="xs" className="uppercase tracking-wide">
							Projects
						</Text>
						<Button variant="plain" size="sm" aria-label="New project">
							<Icon icon={<Plus />} />
						</Button>
					</Flex>
					<SidebarList aria-label="Projects">
						{projects.map((item) => (
							<SidebarItem
								key={item.value}
								icon={<Folder />}
								current={active === item.value}
								onClick={() => setActive(item.value)}
							>
								<SidebarLabel>{item.label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarList>
				</SidebarSection>

				<SidebarSection>
					<Flex align="center" justify="between" gap="sm">
						<Text tone="muted" size="xs" className="uppercase tracking-wide">
							Chats
						</Text>
						<Button variant="plain" size="sm" aria-label="New chat">
							<Icon icon={<Plus />} />
						</Button>
					</Flex>
					<SidebarList aria-label="Chats">
						{chats.map((item) => (
							<SidebarItem
								key={item.value}
								icon={<MessageCircle />}
								current={active === item.value}
								onClick={() => setActive(item.value)}
							>
								<SidebarLabel>{item.label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarList>
				</SidebarSection>

				<Spacer />

				<SidebarSection>
					<Text tone="muted" size="xs" className="py-2 uppercase tracking-wide">
						Wade Cooper
					</Text>
					<SidebarList aria-label="Account">
						<SidebarItem icon={<Cog />}>
							<SidebarLabel>Settings</SidebarLabel>
						</SidebarItem>
						<SidebarItem icon={<LogOut />}>
							<SidebarLabel>Log out</SidebarLabel>
						</SidebarItem>
					</SidebarList>
				</SidebarSection>
			</SidebarBody>
		</Sidebar>
	)
}

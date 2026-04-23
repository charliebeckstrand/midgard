'use client'

import {
	ChartBar,
	Cog,
	Folder,
	Home,
	Inbox,
	LogOut,
	MessageCircle,
	Plus,
	Search,
	UserCircle2,
	Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarItemActions,
	SidebarLabel,
	SidebarSection,
	SidebarSpacer,
} from '../../components/sidebar'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const primary = [
	{ value: 'home', label: 'Home', icon: <Home /> },
	{ value: 'inbox', label: 'Inbox', icon: <Inbox /> },
	{ value: 'team', label: 'Team', icon: <Users /> },
	{ value: 'reports', label: 'Reports', icon: <ChartBar /> },
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

function SidebarFrame({ children }: { children: ReactNode }) {
	return (
		<div className="h-108 w-72 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
			{children}
		</div>
	)
}

function DefaultSidebar() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarBody>
					<SidebarSection>
						{primary.map(({ value, label, icon }) => (
							<SidebarItem
								key={value}
								icon={icon}
								current={active === value}
								onClick={() => setActive(value)}
							>
								<SidebarLabel>{label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

function HeaderFooterSidebar() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarHeader>
					<Heading level={3}>Acme Inc.</Heading>
				</SidebarHeader>
				<SidebarBody>
					<SidebarSection>
						{primary.map(({ value, label, icon }) => (
							<SidebarItem
								key={value}
								icon={icon}
								current={active === value}
								onClick={() => setActive(value)}
							>
								<SidebarLabel>{label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>
				</SidebarBody>
				<SidebarFooter>
					<SidebarItem icon={<UserCircle2 />}>
						<SidebarLabel>Wade Cooper</SidebarLabel>
						<Spacer />
					</SidebarItem>
				</SidebarFooter>
			</Sidebar>
		</SidebarFrame>
	)
}

function SectionedSidebar() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarHeader>
					<Heading level={3}>Workspace</Heading>
				</SidebarHeader>
				<SidebarBody>
					<SidebarSection>
						{primary.slice(0, 2).map(({ value, label, icon }) => (
							<SidebarItem
								key={value}
								icon={icon}
								current={active === value}
								onClick={() => setActive(value)}
							>
								<SidebarLabel>{label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>

					<SidebarDivider />

					<SidebarSection>
						<Stack direction="row" align="center" gap={2}>
							<Text variant="muted" className="text-xs uppercase tracking-wide flex-1">
								Projects
							</Text>
							<Button
								variant="plain"
								size="sm"
								aria-label="New project"
								prefix={<Icon icon={<Plus />} />}
							/>
						</Stack>
						{projects.map(({ value, label }) => (
							<SidebarItem
								key={value}
								icon={<Folder />}
								current={active === value}
								onClick={() => setActive(value)}
							>
								<SidebarLabel>{label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>

					<SidebarSection>
						<Stack direction="row" align="center" gap={2}>
							<Text variant="muted" className="text-xs uppercase tracking-wide flex-1">
								Chats
							</Text>
							<Button
								variant="plain"
								size="sm"
								aria-label="New project"
								prefix={<Icon icon={<Plus />} />}
							/>
						</Stack>
						{chats.map(({ value, label }) => (
							<SidebarItem
								key={value}
								icon={<MessageCircle />}
								current={active === value}
								onClick={() => setActive(value)}
							>
								<SidebarLabel>{label}</SidebarLabel>
							</SidebarItem>
						))}
					</SidebarSection>

					<SidebarSpacer />

					<SidebarSection>
						<Text variant="muted" className="text-xs uppercase tracking-wide flex-1 py-2">
							Wade Cooper
						</Text>
						<SidebarItem icon={<Cog />}>
							<SidebarLabel>Settings</SidebarLabel>
						</SidebarItem>
						<SidebarItem icon={<LogOut />}>
							<SidebarLabel>Log Out</SidebarLabel>
						</SidebarItem>
					</SidebarSection>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

function ItemActionsSidebar() {
	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarBody>
					<SidebarSection>
						<SidebarItem icon={<Search />} preventClose>
							<SidebarLabel>Search</SidebarLabel>
							<Spacer />
							<SidebarItemActions>
								<Badge color="zinc" size="sm">
									⌘K
								</Badge>
							</SidebarItemActions>
						</SidebarItem>
						<SidebarItem icon={<Inbox />}>
							<SidebarLabel>Inbox</SidebarLabel>
							<Spacer />
							<SidebarItemActions>
								<Badge color="blue" size="sm">
									12
								</Badge>
							</SidebarItemActions>
						</SidebarItem>
					</SidebarSection>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

export default function SidebarDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<DefaultSidebar />
			</Example>

			<Example title="With header and footer">
				<HeaderFooterSidebar />
			</Example>

			<Example title="Sections, divider, and spacer">
				<SectionedSidebar />
			</Example>

			<Example title="With item actions">
				<ItemActionsSidebar />
			</Example>
		</Stack>
	)
}

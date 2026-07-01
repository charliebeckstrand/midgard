import {
	Aperture,
	ChartBar,
	ChevronDown,
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
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarItemActions,
	SidebarLabel,
	SidebarList,
	SidebarSection,
	SidebarSpacer,
} from '../../../components/sidebar'
import { Spacer } from '../../../components/spacer'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { cn } from '../../../core'
import { Example } from '../../engine'

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

function SidebarFrame({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				'h-108 w-72 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800',
				className,
			)}
		>
			{children}
		</div>
	)
}

function DefaultSidebarExample() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarBody>
					<SidebarList aria-label="Main">
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
					</SidebarList>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

function HeaderFooterSidebarExample() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarHeader>
					<Heading level={3}>Acme Inc.</Heading>
				</SidebarHeader>
				<SidebarBody>
					<SidebarList aria-label="Main">
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
					</SidebarList>
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

function SectionedSidebarExample() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarHeader>
					<Heading level={3}>Workspace</Heading>
				</SidebarHeader>
				<SidebarBody>
					<SidebarList aria-label="Main">
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
					</SidebarList>

					<SidebarDivider />

					<SidebarSection>
						<Stack direction="row" align="center" gap="sm">
							<Text severity="muted" className="text-xs uppercase tracking-wide flex-1">
								Projects
							</Text>
							<Button variant="plain" size="sm" aria-label="New project">
								<Icon icon={<Plus />} />
							</Button>
						</Stack>
						<SidebarList aria-label="Projects">
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
						</SidebarList>
					</SidebarSection>

					<SidebarSection>
						<Stack direction="row" align="center" gap="sm">
							<Text severity="muted" className="text-xs uppercase tracking-wide flex-1">
								Chats
							</Text>
							<Button variant="plain" size="sm" aria-label="New chat">
								<Icon icon={<Plus />} />
							</Button>
						</Stack>
						<SidebarList aria-label="Chats">
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
						</SidebarList>
					</SidebarSection>

					<SidebarSpacer />

					<SidebarSection>
						<Text severity="muted" className="text-xs uppercase tracking-wide flex-1 py-2">
							Wade Cooper
						</Text>
						<SidebarList aria-label="Account">
							<SidebarItem icon={<Cog />}>
								<SidebarLabel>Settings</SidebarLabel>
							</SidebarItem>
							<SidebarItem icon={<LogOut />}>
								<SidebarLabel>Log Out</SidebarLabel>
							</SidebarItem>
						</SidebarList>
					</SidebarSection>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

function SuffixSidebarExample() {
	return (
		<SidebarFrame>
			<Sidebar>
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
		</SidebarFrame>
	)
}

function ActionsSidebarExample() {
	return (
		<SidebarFrame>
			<Sidebar>
				<SidebarBody>
					<SidebarList aria-label="Main">
						<SidebarItem icon={<Inbox />}>
							<SidebarLabel>Inbox</SidebarLabel>
							<SidebarItemActions>
								<Menu placement="bottom-end">
									<MenuTrigger>
										<Button variant="bare">
											<Icon icon={<ChevronDown />} />
										</Button>
									</MenuTrigger>
									<MenuContent>
										<MenuSection>
											<MenuItem>
												<MenuLabel>Mark as Read</MenuLabel>
											</MenuItem>
											<MenuItem>
												<MenuLabel>Move to Folder</MenuLabel>
											</MenuItem>
											<MenuItem>
												<MenuLabel>Delete</MenuLabel>
											</MenuItem>
										</MenuSection>
									</MenuContent>
								</Menu>
							</SidebarItemActions>
						</SidebarItem>
					</SidebarList>
				</SidebarBody>
			</Sidebar>
		</SidebarFrame>
	)
}

function MiniSidebarExample() {
	const [active, setActive] = useState('home')

	return (
		<SidebarFrame className="lg:w-fit">
			<Sidebar mini>
				{(mini) => (
					<>
						<SidebarHeader>
							{mini ? (
								// Fills the header row so the glyph centers on the rail's
								// icon column (the items' symmetric padding does the rest).
								<div className="flex flex-1 justify-center">
									<Icon
										icon={<Aperture />}
										size="lg"
										className="hover:rotate-360 transition-transform duration-300"
									/>
								</div>
							) : (
								<Heading level={3}>Acme Inc.</Heading>
							)}
						</SidebarHeader>
						<SidebarBody>
							<SidebarList aria-label="Main">
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
							</SidebarList>
						</SidebarBody>
					</>
				)}
			</Sidebar>
		</SidebarFrame>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<DefaultSidebarExample />
			</Example>

			<Example title="With header and footer">
				<HeaderFooterSidebarExample />
			</Example>

			<Example title="Sections, divider, and spacer">
				<SectionedSidebarExample />
			</Example>

			<Example title="With suffix slot">
				<SuffixSidebarExample />
			</Example>

			<Example title="With actions">
				<ActionsSidebarExample />
			</Example>

			<Example
				title="Mini"
				prefix={
					<Text severity="muted">
						In its mini variant, the sidebar collapses to a slim icon rail; on mobile, it reverts to
						standard sidebar behavior.
					</Text>
				}
			>
				<MiniSidebarExample />
			</Example>
		</>
	)
}

'use client'

import {
	ChevronUpDownIcon,
	Cog8ToothIcon,
	KeyIcon,
	ShieldExclamationIcon,
	UsersIcon,
} from '@heroicons/react/20/solid'
import type { User } from 'auth'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SignOutMenuItem } from 'shared/auth'
import { Avatar } from 'ui/avatar'
import { Button } from 'ui/button'
import { EventsAside, EventsButton, EventsSwitch } from 'ui/events'
import { SidebarLayout, StackedLayout, StackedLayoutBody, StackedLayoutHeader } from 'ui/layouts'
import { Link } from 'ui/link'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { NavBar } from 'ui/nav'
import { AppearanceSettings } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'
import {
	Sidebar,
	SidebarBody,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'ui/sidebar'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { Spacer } from 'ui/structure/spacer'
import { Text } from 'ui/text'

// The box that scrolls the pages of an admin. It has the height of the
// viewport, so the document is never taller than the screen. Chrome on iOS
// collapses its toolbars only on a page that is taller than the screen, and on
// a load of such a page it draws the old page under the toolbar for a frame.
// The toolbars of a phone thus stay at their full size while the box scrolls.
// The box is a size container, so the layout fills the box (`SidebarLayout`).
// A size container gets no width from its content, so the box takes the full
// width of the body, which is a flex row.
//
// In print, the box has the height of its content and does not scroll, so each
// page prints whole. The box is not a size container in print: a size container
// gets no height from its content.
const SCROLLER =
	'h-dvh w-full overflow-y-auto @container-size print:h-auto print:overflow-visible print:@container-normal'

type SignedInClientProps = {
	user: User
	/**
	 * Whether the user is an admin. An admin gets the sidebar, and each other
	 * user gets the header.
	 */
	admin: boolean
	children: ReactNode
}

/**
 * Chrome of each signed-in page. An admin gets the sidebar with the admin
 * pages. Each other user gets a header, because that user can open only the
 * account page.
 *
 * @remarks
 * The layout of the group renders it, so the chrome stays mounted when the
 * admin goes between the admin pages and the account page.
 */
export function SignedInClient({ user, admin, children }: SignedInClientProps) {
	if (!admin) return <HeaderShell user={user}>{children}</HeaderShell>

	return <SidebarShell user={user}>{children}</SidebarShell>
}

/**
 * Sidebar chrome of an admin: the navigation, the account menu, and the
 * appearance settings.
 *
 * @internal
 * @remarks Gives the current pathname to `UIProvider`, so each item with an
 * `href` marks itself current. The account item is a menu trigger, not a link,
 * so it sets `current` itself. The chrome renders at request time, after the
 * session, so `usePathname` here does not stop the prerender of a route with
 * params.
 *
 * The pages scroll in a box (`SCROLLER`). On a navigation to a new page, the
 * router scrolls the new page into view in the box, so the page starts at the
 * top.
 */
function SidebarShell({ user, children }: { user: User; children: ReactNode }) {
	const pathname = usePathname()

	return (
		<UIProvider pathname={pathname}>
			<div className={SCROLLER}>
				<SidebarLayout
					actions={<EventsButton />}
					aside={<EventsAside />}
					navbar={
						<NavBar variant="plain" className="px-0 py-0">
							<Link href="/" className="flex">
								<Brand />
							</Link>
						</NavBar>
					}
					sidebar={
						<Sidebar>
							<SidebarHeader>
								<SidebarItem href="/">
									<Image src="/gradient.png" alt="" width={24} height={24} />
									<SidebarLabel>
										<Text className="font-black text-lg">Admin</Text>
									</SidebarLabel>
								</SidebarItem>
							</SidebarHeader>
							<SidebarBody>
								<SidebarSection>
									<SidebarItem href="/users" match="prefix">
										<UsersIcon />
										<SidebarLabel>Users</SidebarLabel>
									</SidebarItem>
									<SidebarItem href="/security" match="prefix">
										<ShieldExclamationIcon />
										<SidebarLabel>Security</SidebarLabel>
									</SidebarItem>
								</SidebarSection>
							</SidebarBody>
							<SidebarFooter>
								{/* The settings button sits beside the account menu, so it shows in
						    the desktop sidebar and in the mobile drawer. */}
								<Flex align="center" gap="sm">
									<div className="min-w-0 flex-1">
										<UserMenu admin placement="top-start">
											<SidebarItem current={pathname.startsWith('/account')}>
												<UserAvatar user={user} />
												<SidebarLabel>{user.email}</SidebarLabel>
												<ChevronUpDownIcon />
											</SidebarItem>
										</UserMenu>
									</div>
									<AppearanceSettings>
										<EventsSwitch />
									</AppearanceSettings>
								</Flex>
							</SidebarFooter>
						</Sidebar>
					}
				>
					{children}
				</SidebarLayout>
			</div>
		</UIProvider>
	)
}

/**
 * Header chrome of a user that is not an admin: the name of the app, the
 * appearance settings, and the account menu. The layout has the height of the
 * viewport, and the body scrolls under the header (see `StackedLayout`).
 *
 * @internal
 */
function HeaderShell({ user, children }: { user: User; children: ReactNode }) {
	return (
		<StackedLayout className="h-dvh w-full print:h-auto">
			<StackedLayoutHeader className="border-b border-zinc-950/5 dark:border-white/5">
				<Container size="md" padding="md">
					<Flex align="center" gap="sm" className="py-2.5">
						<Link href="/account" className="flex">
							<Brand />
						</Link>
						<Spacer />
						<EventsButton />
						<AppearanceSettings>
							<EventsSwitch />
						</AppearanceSettings>
						<UserMenu placement="bottom-end">
							<Button variant="plain" aria-label="User menu">
								<UserAvatar user={user} />
							</Button>
						</UserMenu>
					</Flex>
				</Container>
			</StackedLayoutHeader>
			<StackedLayoutBody>
				<Container size="md" padding="md" className="density-pt-[2,3,4,5,6] pb-8 lg:pb-12">
					{children}
				</Container>
			</StackedLayoutBody>
		</StackedLayout>
	)
}

/** The mark and the name of the app. @internal */
function Brand() {
	return (
		<Flex as="span" align="center" gap="sm">
			<Image src="/gradient.png" alt="" width={24} height={24} />
			<Text className="font-black text-lg">Admin</Text>
		</Flex>
	)
}

/** Avatar of the user, with the first letter of the email. @internal */
function UserAvatar({ user }: { user: User }) {
	return (
		<Avatar
			initials={user.email[0]?.toUpperCase() ?? 'U'}
			className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
		/>
	)
}

type UserMenuProps = {
	/** Whether to show the admin-only settings link. */
	admin?: boolean
	placement: 'top-start' | 'bottom-end'
	/** The trigger. */
	children: ReactNode
}

/**
 * User menu: the account and settings links, and sign-out.
 *
 * @internal
 * @remarks Sign-out is `SignOutMenuItem` from `shared/auth`.
 */
function UserMenu({ admin, placement, children }: UserMenuProps) {
	return (
		<Menu placement={placement}>
			<MenuTrigger>{children}</MenuTrigger>
			<MenuContent>
				<MenuItem href="/account">
					<KeyIcon />
					<MenuLabel>Account</MenuLabel>
				</MenuItem>
				{admin && (
					<MenuItem href="/settings">
						<Cog8ToothIcon />
						<MenuLabel>Settings</MenuLabel>
					</MenuItem>
				)}
				<MenuSeparator />
				<SignOutMenuItem />
			</MenuContent>
		</Menu>
	)
}

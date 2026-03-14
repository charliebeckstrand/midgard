'use client'

import { BookOpenIcon, LockClosedIcon } from '@heroicons/react/20/solid'
import {
	Navbar,
	NavbarSpacer,
	Sidebar,
	SidebarBody,
	SidebarHeading,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface DocEntry {
	slug: string
	title: string
	authRequired: boolean
}

interface ShellProps {
	children: ReactNode
	docs: DocEntry[]
	authenticated: boolean
}

export function Shell({ children, docs, authenticated }: ShellProps) {
	const pathname = usePathname()

	const publicDocs = docs.filter((d) => !d.authRequired)
	const protectedDocs = docs.filter((d) => d.authRequired)

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<NavbarSpacer />
					{!authenticated && (
						<a
							href="/login"
							className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
						>
							Sign in
						</a>
					)}
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							<SidebarItem href="/" current={pathname === '/'}>
								<BookOpenIcon />
								<SidebarLabel>All Docs</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
						<SidebarSection>
							<SidebarHeading>Documentation</SidebarHeading>
							{publicDocs.map((doc) => (
								<SidebarItem
									key={doc.slug}
									href={`/${doc.slug}`}
									current={pathname === `/${doc.slug}`}
								>
									<SidebarLabel>{doc.title}</SidebarLabel>
								</SidebarItem>
							))}
						</SidebarSection>
						{authenticated && protectedDocs.length > 0 && (
							<SidebarSection>
								<SidebarHeading>Protected</SidebarHeading>
								{protectedDocs.map((doc) => (
									<SidebarItem
										key={doc.slug}
										href={`/${doc.slug}`}
										current={pathname === `/${doc.slug}`}
									>
										<LockClosedIcon />
										<SidebarLabel>{doc.title}</SidebarLabel>
									</SidebarItem>
								))}
							</SidebarSection>
						)}
					</SidebarBody>
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}

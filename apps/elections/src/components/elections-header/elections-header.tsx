'use client'

import { usePathname } from 'next/navigation'
import { Fragment, type ReactNode } from 'react'
import { Badge } from 'ui/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { StackedLayoutHeader } from 'ui/layouts'
import { Link } from 'ui/link'
import { MenuItem, MenuLabel, MenuSeparator } from 'ui/menu'
import { useIntl } from 'ui/primitives/intl'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import type { Crumb, ElectionMenuItem } from '../../utilities/trail'
import { MenuCrumb } from '../menu-crumb'

/** The date of an election to come, such as `Nov 3, 2026`, in the zone of the election day. */
function ElectionDate({ date }: { date: string }) {
	const intl = useIntl()

	return intl.formatDate(`${date}T12:00:00Z`, { dateStyle: 'medium', timeZone: 'UTC' })
}

/** Whether a crumb is the page that the reader is on: it leads nowhere, or it leads to this page. */
function isHere(crumb: Crumb, pathname: string): boolean {
	return crumb.href === undefined || crumb.href === pathname
}

/** The label of a crumb: a link where the crumb leads somewhere, or the plain name where it does not. */
function CrumbLink({ crumb, current }: { crumb: Crumb; current: boolean }) {
	return crumb.href === undefined ? (
		<BreadcrumbLink current={current} className="font-semibold">
			{crumb.label}
		</BreadcrumbLink>
	) : (
		<BreadcrumbLink
			current={current}
			href={crumb.href}
			render={<Link href={crumb.href} />}
			className="font-semibold"
		>
			{crumb.label}
		</BreadcrumbLink>
	)
}

/**
 * The crumb of an election, with a chevron that opens the elections of its
 * year. On a page under the election, its name leads to the overview of the
 * election. On the overview itself the name leads nowhere, so a press on any
 * part of the crumb opens the menu.
 */
function ElectionCrumb({
	crumb,
	menu,
	current,
}: {
	crumb: Crumb
	menu: readonly ElectionMenuItem[]
	current: boolean
}) {
	const pathname = usePathname()

	return (
		<MenuCrumb
			label={crumb.label}
			current={current}
			link={isHere(crumb, pathname) ? undefined : <CrumbLink crumb={crumb} current={false} />}
		>
			{menu.map((item) => (
				<MenuItem key={item.href} href={item.href}>
					<MenuLabel>{item.label}</MenuLabel>

					{item.live ? (
						<Badge variant="soft" color="green">
							Live
						</Badge>
					) : item.upcoming === null ? null : (
						<span className="text-sm text-zinc-500 dark:text-zinc-400">
							<ElectionDate date={item.upcoming} />
						</span>
					)}
				</MenuItem>
			))}

			<MenuSeparator />

			<MenuItem href="/">
				<MenuLabel>All elections</MenuLabel>
			</MenuItem>
		</MenuCrumb>
	)
}

/** Props for {@link ElectionsHeader}. */
export type ElectionsHeaderProps = {
	crumbs: readonly Crumb[]
	/** The search of the page, before the appearance settings, such as `RaceSearch` on a page of an election. */
	search?: ReactNode
}

/**
 * The bar at the top of each page. The title is the trail, such as
 * `Elections › 2026 › United States › Midterms`, where each crumb but the last
 * leads up. The last crumb is the current page only where it is the page: on
 * the page of an office, the election crumb leads up to the overview. The trail gives way from the left, as the trail of Places does.
 * The search and the appearance settings sit on its right. The bar stays at
 * the top while the body under it scrolls (`PageColumn`).
 */
export function ElectionsHeader({ crumbs, search }: ElectionsHeaderProps) {
	const pathname = usePathname()

	return (
		<StackedLayoutHeader className="border-b border-zinc-950/10 dark:border-white/10">
			<Container size="lg" padding="lg">
				<Flex justify="between" align="center" gap="md" className="h-16">
					{/* `min-w-0` lets the trail give way, and `flex-1` gives it the room that its fit measures. */}
					<div className="min-w-0 flex-1">
						<Breadcrumb collapse>
							<BreadcrumbList className="text-lg/7 sm:text-xl/8">
								{crumbs.map((crumb, index) => (
									// By position, because the trail grows and shrinks only at its tail.
									<Fragment key={index}>
										{index > 0 ? <BreadcrumbSeparator /> : null}

										<BreadcrumbItem>
											{crumb.menu === undefined ? (
												<CrumbLink
													crumb={crumb}
													current={index === crumbs.length - 1 && isHere(crumb, pathname)}
												/>
											) : (
												<ElectionCrumb
													crumb={crumb}
													menu={crumb.menu}
													current={index === crumbs.length - 1 && isHere(crumb, pathname)}
												/>
											)}
										</BreadcrumbItem>
									</Fragment>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<Flex align="center" gap="sm">
						{search}

						<AppearanceSettings />
					</Flex>
				</Flex>
			</Container>
		</StackedLayoutHeader>
	)
}

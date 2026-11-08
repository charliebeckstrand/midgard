'use client'

import { ChevronDown } from 'lucide-react'
import { Fragment } from 'react'
import { Badge } from 'ui/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { StackedLayoutHeader } from 'ui/layouts'
import { Link } from 'ui/link'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'
import { useIntl } from 'ui/primitives/intl'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import type { Crumb, ElectionMenuItem } from '../../utilities/trail'

/** The date of an election to come, such as `Nov 3, 2026`, in the zone of the election day. */
function ElectionDate({ date }: { date: string }) {
	const intl = useIntl()

	return intl.formatDate(`${date}T12:00:00Z`, { dateStyle: 'medium', timeZone: 'UTC' })
}

/**
 * The crumb of an election: its name, which leads to its overview, and a
 * chevron that opens the elections of its year. The name is a crumb as any
 * other, so it gives way to a mark when the row runs out of room.
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
	return (
		<span className="inline-flex min-w-0 items-center">
			{crumb.href === undefined ? (
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
			)}

			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button
						type="button"
						variant="bare"
						aria-label={`Switch from ${crumb.label}`}
						className="shrink-0"
					>
						<Icon icon={<ChevronDown />} />
					</Button>
				</MenuTrigger>

				<MenuContent>
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
				</MenuContent>
			</Menu>
		</span>
	)
}

/**
 * The bar at the top of each page. The title is the trail, such as
 * `2026 › United States › Midterms › Georgia`, where each crumb but the last
 * leads up. The trail gives way from the left, as the trail of Places does.
 * The appearance settings sit on its right. The bar stays at the top while
 * the body under it scrolls (`PageColumn`).
 */
export function ElectionsHeader({ crumbs }: { crumbs: readonly Crumb[] }) {
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
											{crumb.menu !== undefined ? (
												<ElectionCrumb
													crumb={crumb}
													menu={crumb.menu}
													current={index === crumbs.length - 1}
												/>
											) : crumb.href === undefined ? (
												<BreadcrumbLink
													current={index === crumbs.length - 1}
													className="font-semibold"
												>
													{crumb.label}
												</BreadcrumbLink>
											) : (
												<BreadcrumbLink
													current={index === crumbs.length - 1}
													href={crumb.href}
													render={<Link href={crumb.href} />}
													className="font-semibold"
												>
													{crumb.label}
												</BreadcrumbLink>
											)}
										</BreadcrumbItem>
									</Fragment>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<AppearanceSettings />
				</Flex>
			</Container>
		</StackedLayoutHeader>
	)
}

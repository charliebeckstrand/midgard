'use client'

import { usePathname } from 'next/navigation'
import { Fragment, type ReactNode } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { StackedLayoutHeader } from 'ui/layouts'
import { Link } from 'ui/link'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import type { Crumb } from '../../utilities/trail'
import { AutoUpdateSwitch } from '../auto-update'

/**
 * The label of a crumb. A crumb that leads to another page is a link. The crumb
 * of the page that the reader is on is the plain name, marked as the current
 * page: it leads nowhere, or it leads to this page, as the election crumb does
 * on the overview.
 */
function CrumbLink({ crumb }: { crumb: Crumb }) {
	const pathname = usePathname()

	return crumb.href === undefined || crumb.href === pathname ? (
		<BreadcrumbLink current className="font-semibold">
			{crumb.label}
		</BreadcrumbLink>
	) : (
		<BreadcrumbLink href={crumb.href} render={<Link href={crumb.href} />} className="font-semibold">
			{crumb.label}
		</BreadcrumbLink>
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
 * `Elections › 2026 › United States › Midterms`, where each crumb leads to its
 * level: `United States` leads to the elections of the country in the year. The
 * last crumb is the current page only where it is the page: on the page of an
 * office, the election crumb leads up to the overview. The trail gives way from
 * the left, as the trail of Places does.
 * The search and the settings sit on its right. The settings add the Auto
 * update switch to the appearance pickers. The bar stays at
 * the top while the body under it scrolls (`PageColumn`).
 */
export function ElectionsHeader({ crumbs, search }: ElectionsHeaderProps) {
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
											<CrumbLink crumb={crumb} />
										</BreadcrumbItem>
									</Fragment>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<Flex align="center" gap="sm">
						{search}

						<AppearanceSettings>
							<AutoUpdateSwitch />
						</AppearanceSettings>
					</Flex>
				</Flex>
			</Container>
		</StackedLayoutHeader>
	)
}

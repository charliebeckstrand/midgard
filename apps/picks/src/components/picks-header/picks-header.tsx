import type { User } from 'auth'
import type { ReactNode } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Placeholder } from 'ui/placeholder'
import { Flex } from 'ui/structure/flex'
import { UserMenu } from '../user-menu'

/** The sticky bar of a header: the trail on the left and the menu on the right. */
function HeaderBar({ trail, menu }: { trail: ReactNode; menu: ReactNode }) {
	return (
		<header className="sticky top-0 z-10 border-b border-zinc-950/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
			<Flex justify="between" align="center" gap="md">
				<Breadcrumb className="min-w-0">
					<BreadcrumbList className="text-xl/8 font-semibold">{trail}</BreadcrumbList>
				</Breadcrumb>

				{menu}
			</Flex>
		</header>
	)
}

type PicksHeaderProps = {
	user: User
	/** The label of the open week, or `undefined` on the schedule. */
	week?: string
}

/**
 * The bar at the top of each page. The title is the trail: `Schedule` alone on
 * the schedule, and `Schedule › Week N` in a week, where `Schedule` goes back.
 */
export function PicksHeader({ user, week }: PicksHeaderProps) {
	return (
		<HeaderBar
			trail={
				<>
					<BreadcrumbItem>
						{week === undefined ? (
							<BreadcrumbLink current>Schedule</BreadcrumbLink>
						) : (
							<BreadcrumbLink href="/">Schedule</BreadcrumbLink>
						)}
					</BreadcrumbItem>

					{week === undefined ? null : (
						<>
							<BreadcrumbSeparator />

							<BreadcrumbItem>
								<BreadcrumbLink current>{week}</BreadcrumbLink>
							</BreadcrumbItem>
						</>
					)}
				</>
			}
			menu={<UserMenu user={user} />}
		/>
	)
}

/**
 * The header of a week while the week loads: `Schedule`, which goes back at
 * once, and placeholders for the week and the menu.
 */
export function WeekHeaderSkeleton() {
	return (
		<HeaderBar
			trail={
				<>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">Schedule</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator />

					<BreadcrumbItem>
						<Placeholder className="h-5 w-20" />
					</BreadcrumbItem>
				</>
			}
			menu={
				// The box of the menu button, so the bar keeps its height.
				<span className="flex size-9.5 shrink-0 items-center justify-center">
					<Placeholder className="size-5 rounded-full" />
				</span>
			}
		/>
	)
}

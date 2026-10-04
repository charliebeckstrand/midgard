import type { User } from 'auth'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Flex } from 'ui/structure/flex'
import { UserMenu } from '../user-menu'

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
		<header className="sticky top-0 z-10 border-b border-zinc-950/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
			<Flex justify="between" align="center" gap="md">
				<Breadcrumb className="min-w-0">
					<BreadcrumbList className="text-xl/8 font-semibold">
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
					</BreadcrumbList>
				</Breadcrumb>

				<UserMenu user={user} />
			</Flex>
		</header>
	)
}

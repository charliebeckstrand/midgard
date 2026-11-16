import type { User } from 'auth'
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
import { Flex } from 'ui/structure/flex'
import { ROUTE_LABELS, type Route } from '../../utilities/seed'
import { NumbersMenu } from '../numbers-menu'
import { DifficultyField, SettingField } from '../setting-field'

/** The tabs of the settings of the game, after the "UI" tab of the appearance pickers. */
const TABS = [
	{
		label: 'Game',
		children: (
			<>
				<SettingField name="autoDraw" label="Auto-draw" />
				<SettingField name="showScore" label="Show score" />
				<DifficultyField />
			</>
		),
	},
]

/** Props for {@link NumbersHeader}. */
export type NumbersHeaderProps = {
	/** The signed-in user, or none. */
	user?: User
	/** The route of the page, which ends the trail and which the menu marks. */
	route: Route
}

/**
 * The bar at the top of the page: the trail, and on its right the settings and
 * the menu. The trail is the name of the app and the route of the page, such as
 * `Numbers › Solo` or `Numbers › Vs CPU`. Numbers leads to Solo, as the Solo
 * item of the menu does, so it starts the run of a new seed. The route is the
 * current page. The trail gives way from the left, as the trails of Places and
 * Elections do. The heading of the page is "Numbers", for a screen reader only.
 *
 * A segment in the settings switches the "UI" tab of the appearance pickers
 * and the "Game" tab, with the Auto-draw and the Show score
 * switches and the picker of the level of the CPU.
 */
export function NumbersHeader({ user, route }: NumbersHeaderProps) {
	return (
		<StackedLayoutHeader className="border-b border-zinc-950/5 dark:border-white/5">
			<Flex align="center" gap="sm" className="mx-auto max-w-md px-4 py-2.5">
				<h1 className="sr-only">Numbers</h1>

				{/* `min-w-0` lets the trail give way, and `flex-1` gives it the room of its fit. */}
				<div className="min-w-0 flex-1">
					<Breadcrumb collapse>
						<BreadcrumbList className="text-lg/7">
							<BreadcrumbItem>
								<BreadcrumbLink href="/" render={<Link href="/" />} className="font-semibold">
									Numbers
								</BreadcrumbLink>
							</BreadcrumbItem>

							<BreadcrumbSeparator />

							<BreadcrumbItem>
								<BreadcrumbLink current className="font-semibold">
									{ROUTE_LABELS[route]}
								</BreadcrumbLink>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>

				<AppearanceSettings tabs={TABS} animate="slide" />

				<NumbersMenu user={user} route={route} />
			</Flex>
		</StackedLayoutHeader>
	)
}

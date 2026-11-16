import type { User } from 'auth'
import { StackedLayoutHeader } from 'ui/layouts'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Flex } from 'ui/structure/flex'
import { Spacer } from 'ui/structure/spacer'
import { Text } from 'ui/text'
import type { Route } from '../../utilities/seed'
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
	/** The route of the page, which the menu marks. */
	route: Route
}

/**
 * The bar at the top of the page: the name of the app, and on its right the
 * settings and the menu. A segment in the settings switches the "UI" tab of the
 * appearance pickers and the "Game" tab, with the Auto-draw and the Show score
 * switches and the picker of the level of the CPU.
 */
export function NumbersHeader({ user, route }: NumbersHeaderProps) {
	return (
		<StackedLayoutHeader className="border-b border-zinc-950/5 dark:border-white/5">
			<Flex align="center" gap="sm" className="mx-auto max-w-md px-4 py-2.5">
				<Text as="h1" className="font-black text-lg">
					Numbers
				</Text>

				<Spacer />

				<AppearanceSettings tabs={TABS} animate="slide" />

				<NumbersMenu user={user} route={route} />
			</Flex>
		</StackedLayoutHeader>
	)
}

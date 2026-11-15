import { StackedLayoutHeader } from 'ui/layouts'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Flex } from 'ui/structure/flex'
import { Spacer } from 'ui/structure/spacer'
import { Text } from 'ui/text'
import { SettingField } from '../setting-field'

/** The tabs of the settings of the game, after the "UI" tab of the appearance pickers. */
const TABS = [
	{
		label: 'Game',
		children: (
			<>
				<SettingField name="autoDraw" label="Auto-draw" />
				<SettingField name="showScore" label="Show score" />
			</>
		),
	},
]

/**
 * The bar at the top of the page: the name of the app, and on its right the
 * settings. A segment in the settings switches the "UI" tab of the appearance
 * pickers and the "Game" tab, with the Auto-draw and the Show score switches.
 */
export function NumbersHeader() {
	return (
		<StackedLayoutHeader className="border-b border-zinc-950/5 dark:border-white/5">
			<Flex align="center" gap="sm" className="mx-auto max-w-md px-4 py-2.5">
				<Text as="h1" className="font-black text-lg">
					Numbers
				</Text>

				<Spacer />

				<AppearanceSettings tabs={TABS} />
			</Flex>
		</StackedLayoutHeader>
	)
}

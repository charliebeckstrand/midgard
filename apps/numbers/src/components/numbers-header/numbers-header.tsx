import { StackedLayoutHeader } from 'ui/layouts'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Flex } from 'ui/structure/flex'
import { Spacer } from 'ui/structure/spacer'
import { Text } from 'ui/text'
import { AutoDrawField } from '../auto-draw-field'

/**
 * The bar at the top of the page: the name of the app, and on its right the
 * settings. The settings add
 * the Auto-draw switch below the appearance pickers. The bar stays at the top
 * while the body under it scrolls.
 */
export function NumbersHeader() {
	return (
		<StackedLayoutHeader className="border-b border-zinc-950/5 dark:border-white/5">
			<Flex align="center" gap="sm" className="mx-auto max-w-md px-4 py-2.5">
				<Text as="h1" className="font-black text-lg">
					Numbers
				</Text>

				<Spacer />

				<AppearanceSettings>
					<AutoDrawField />
				</AppearanceSettings>
			</Flex>
		</StackedLayoutHeader>
	)
}

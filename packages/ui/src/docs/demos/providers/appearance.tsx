import { Text } from '../../../components/text'
import { AppearanceSettings, useAppearance } from '../../../providers/appearance'
import { Example } from '../../engine'

export const meta = { name: 'Appearance' }

// The docs app mounts `AppearanceProvider` at its root, so these examples edit
// the theme and the density of the whole docs site.
function CurrentAppearance() {
	const { theme, density } = useAppearance()

	return (
		<Text>
			Theme: {theme}. Density: {density}.
		</Text>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Settings button">
				<AppearanceSettings />
			</Example>

			<Example title="Read the appearance with useAppearance">
				<CurrentAppearance />
			</Example>
		</>
	)
}

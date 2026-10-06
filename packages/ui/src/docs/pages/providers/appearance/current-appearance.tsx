import { useAppearance } from 'ui/providers/appearance'
import { Text } from 'ui/text'

export default function CurrentAppearance() {
	const { theme, density, motion, sidebar } = useAppearance()

	return (
		<Text>
			Theme: {theme}. Density: {density}. Motion: {motion}. Sidebar: {sidebar}.
		</Text>
	)
}

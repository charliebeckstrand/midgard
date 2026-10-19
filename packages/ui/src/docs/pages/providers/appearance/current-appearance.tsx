import { motionModes, sidebarModes, themeModes, useAppearance } from 'ui/providers/appearance'
import { densityLevels } from 'ui/providers/density'
import { Text } from 'ui/text'

function labelOf<T>(options: { label: string; value: T }[], value: T) {
	return options.find((option) => option.value === value)?.label
}

export default function CurrentAppearance() {
	const { theme, density, motion, sidebar } = useAppearance()

	return (
		<>
			<Text>Theme: {labelOf(themeModes, theme)}</Text>
			<Text>Density: {labelOf(densityLevels, density)}</Text>
			<Text>Motion: {labelOf(motionModes, motion)}</Text>
			<Text>Sidebar: {labelOf(sidebarModes, sidebar)}</Text>
		</>
	)
}

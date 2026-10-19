import { type MessageDescriptor, useIntl } from 'ui/primitives/intl'
import { motionModes, sidebarModes, themeModes, useAppearance } from 'ui/providers/appearance'
import { densityLevels } from 'ui/providers/density'
import { Text } from 'ui/text'

type Option<T> = { message: MessageDescriptor; value: T }

export default function CurrentAppearance() {
	const intl = useIntl()

	const { theme, density, motion, sidebar } = useAppearance()

	// The name of a mode in the language of the reader.
	const labelOf = <T,>(options: Option<T>[], value: T) => {
		const option = options.find((candidate) => candidate.value === value)

		return option && intl.formatMessage(option.message)
	}

	return (
		<>
			<Text>Theme: {labelOf(themeModes, theme)}</Text>
			<Text>Density: {labelOf(densityLevels, density)}</Text>
			<Text>Motion: {labelOf(motionModes, motion)}</Text>
			<Text>Sidebar: {labelOf(sidebarModes, sidebar)}</Text>
		</>
	)
}

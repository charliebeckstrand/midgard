import { Flex } from 'ui/flex'
import { Swatch } from 'ui/swatch'
import { Text } from 'ui/text'

const colors = [
	{ color: 'violet', label: 'Palette name' },
	{ color: '#7c3aed', label: 'Hex' },
	{ color: 'oklch(54.1% 0.281 293.009)', label: 'OKLCH' },
	{ color: 'text-violet-600 dark:text-violet-500', label: 'Utility class' },
]

export default function Color() {
	return (
		<Flex gap="md" wrap>
			{colors.map(({ color, label }) => (
				<Flex key={label} gap="sm">
					<Swatch color={color} />
					<Text as="span" tone="muted" size="sm">
						{label}
					</Text>
				</Flex>
			))}
		</Flex>
	)
}

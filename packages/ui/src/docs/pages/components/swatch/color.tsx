import { Flex } from 'ui/flex'
import { Swatch } from 'ui/swatch'
import { Text } from 'ui/text'

const colors = [
	{ color: 'violet', format: 'palette name' },
	{ color: '#7c3aed', format: 'hex' },
	{ color: 'oklch(54.1% 0.281 293.009)', format: 'oklch' },
	{ color: 'text-violet-600 dark:text-violet-500', format: 'utility class' },
]

export default function Color() {
	return (
		<Flex gap="md" wrap>
			{colors.map(({ color, format }) => (
				<Flex key={format} gap="sm">
					<Swatch color={color} />
					<Text as="span" tone="muted" size="sm">
						{format}
					</Text>
				</Flex>
			))}
		</Flex>
	)
}

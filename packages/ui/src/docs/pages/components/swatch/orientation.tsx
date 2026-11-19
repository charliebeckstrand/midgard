import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { Swatch } from 'ui/swatch'
import { Text } from 'ui/text'

const rules = [
	{ color: 'green', orientation: 'horizontal', label: 'Revenue target' },
	{ color: 'red', orientation: 'horizontal', label: 'Cost cap' },
	{ color: 'amber', orientation: 'vertical', label: 'Price change' },
] as const

export default function Orientation() {
	return (
		<Stack gap="xs" align="start">
			{rules.map(({ color, orientation, label }) => (
				<Flex key={label} gap="sm">
					<Swatch shape="line" variant="dashed" orientation={orientation} color={color} />
					<Text as="span" tone="muted" size="sm">
						{label}
					</Text>
				</Flex>
			))}
		</Stack>
	)
}

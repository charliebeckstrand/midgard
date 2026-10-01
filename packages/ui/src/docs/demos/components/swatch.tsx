import { Swatch } from '../../../components/swatch'
import { Text } from '../../../components/text'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes of="Swatch" render={(props) => <Swatch {...props} color="blue" />} />

			<Example title="Color">
				<Flex gap="md">
					<Flex gap="sm">
						<Swatch color="violet" />

						<Text as="span" tone="muted" size="sm">
							palette name
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="#7c3aed" />

						<Text as="span" tone="muted" size="sm">
							hex
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="oklch(54.1% 0.281 293.009)" />

						<Text as="span" tone="muted" size="sm">
							oklch
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="text-violet-600 dark:text-violet-500" />

						<Text as="span" tone="muted" size="sm">
							utility class
						</Text>
					</Flex>
				</Flex>
			</Example>
		</>
	)
}

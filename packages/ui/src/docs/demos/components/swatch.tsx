import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { Swatch } from '../../../components/swatch'
import { Text } from '../../../components/text'
import { Example } from '../../engine'

const shapes = ['square', 'circle', 'line'] as const

const variants = ['solid', 'soft', 'outline'] as const

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export function Demo() {
	return (
		<>
			<Example title="Shapes">
				<Stack gap="md">
					{shapes.map((shape) => (
						<Flex key={shape} gap="sm">
							<Swatch shape={shape} color="text-blue-600 dark:text-blue-500" />

							<Text as="span" severity="muted" size="sm">
								{shape}
							</Text>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example title="Variants">
				<Flex gap="md">
					{variants.map((variant) => (
						<Flex key={variant} gap="sm">
							<Swatch variant={variant} color="text-violet-600 dark:text-violet-500" />

							<Text as="span" severity="muted" size="sm">
								{variant}
							</Text>
						</Flex>
					))}
				</Flex>
			</Example>

			<Example title="Dashed line">
				<Flex gap="md">
					<Flex gap="sm">
						<Swatch shape="line" color="text-blue-600 dark:text-blue-500" />

						<Text as="span" severity="muted" size="sm">
							solid
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch shape="line" variant="dashed" color="text-blue-600 dark:text-blue-500" />

						<Text as="span" severity="muted" size="sm">
							dashed
						</Text>
					</Flex>
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex gap="md">
					{sizes.map((size) => (
						<Flex key={size} gap="sm">
							<Swatch shape="circle" size={size} color="text-green-600 dark:text-green-500" />

							<Text as="span" severity="muted" size="sm">
								{size}
							</Text>
						</Flex>
					))}
				</Flex>
			</Example>
		</>
	)
}

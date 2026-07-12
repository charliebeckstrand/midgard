import { useState } from 'react'
import { Flex } from '../../../components/flex'
import { Listbox, ListboxOption } from '../../../components/listbox'
import { Stack } from '../../../components/stack'
import { Swatch } from '../../../components/swatch'
import { Text } from '../../../components/text'
import { Example } from '../../engine'

type Shape = 'square' | 'circle' | 'line'
type Variant = 'solid' | 'soft' | 'outline' | 'dashed'

const shapes: readonly Shape[] = ['square', 'circle', 'line'] as const
const variants: readonly Variant[] = ['solid', 'soft', 'outline', 'dashed'] as const

export function Demo() {
	const [selectedShape, setSelectedShape] = useState<Shape>('square')

	return (
		<>
			<Example title="Shapes">
				<Stack gap="md">
					{shapes.map((shape) => (
						<Flex key={shape} gap="sm">
							<Swatch shape={shape} color="blue" />

							<Text as="span" severity="muted" size="sm">
								{shape}
							</Text>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example
				title="Variants"
				actions={
					<Listbox
						value={selectedShape}
						displayValue={() => selectedShape}
						onValueChange={(value) => value && setSelectedShape(value)}
					>
						{shapes.map((shape) => (
							<ListboxOption key={shape} value={shape}>
								{shape}
							</ListboxOption>
						))}
					</Listbox>
				}
			>
				<Flex gap="md">
					{variants.map((variant) => (
						<Flex key={variant} gap="sm">
							<Swatch shape={selectedShape} variant={variant} color="orange" />

							<Text as="span" severity="muted" size="sm">
								{variant}
							</Text>
						</Flex>
					))}
				</Flex>
			</Example>

			<Example title="Color">
				<Flex gap="md">
					<Flex gap="sm">
						<Swatch color="violet" />

						<Text as="span" severity="muted" size="sm">
							palette name
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="#7c3aed" />

						<Text as="span" severity="muted" size="sm">
							hex
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="oklch(54.1% 0.281 293.009)" />

						<Text as="span" severity="muted" size="sm">
							oklch
						</Text>
					</Flex>

					<Flex gap="sm">
						<Swatch color="text-violet-600 dark:text-violet-500" />

						<Text as="span" severity="muted" size="sm">
							utility class
						</Text>
					</Flex>
				</Flex>
			</Example>
		</>
	)
}

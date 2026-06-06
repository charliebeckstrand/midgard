import { Heading } from '../../components/heading'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { type DensityLevel, DensityProvider } from '../../providers/density'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const levels = [1, 2, 3, 4, 5, 6] as const

const densities: DensityLevel[] = ['compact', 'snug', 'loose']

export function Demo() {
	return (
		<>
			<Example title="Levels">
				{levels.map((level) => (
					<Heading key={level} level={level}>
						Heading {level}
					</Heading>
				))}
			</Example>
			<Example title="Density">
				{densities.map((density) => (
					<DensityProvider key={density} density={density}>
						<Stack gap="xs">
							<Text variant="muted">{density}</Text>
							<Heading level={1}>Heading 1</Heading>
							<Heading level={3}>Heading 3</Heading>
						</Stack>
					</DensityProvider>
				))}
			</Example>
			<Example title="Override">
				<DensityProvider density="compact">
					<Heading level={1}>Inherits compact density</Heading>
					<Heading level={1} size="lg">
						Pinned larger with size
					</Heading>
				</DensityProvider>
			</Example>
		</>
	)
}

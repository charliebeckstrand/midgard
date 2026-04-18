import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function TextDemo() {
	return (
		<Stack gap={6}>
			<Example title="Variants">
				<Text>The lazy dog jumps over the quick brown fox.</Text>
			</Example>

			<Example title="Variants">
				<Text>The lazy dog jumps over the quick brown fox.</Text>
				<Text variant="muted">
					This is muted text, useful for descriptions and secondary content.
				</Text>
				<Text variant="error">This is error text, useful for error messages.</Text>
			</Example>
		</Stack>
	)
}

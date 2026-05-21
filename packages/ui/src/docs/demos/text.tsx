import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const variants = ['default', 'primary', 'success', 'warning', 'error', 'muted'] as const

export function Demo() {
	return (
		<Stack>
			<Example title="Variants">
				{variants.map((variant) => (
					<Text key={variant} variant={variant}>
						{variant} - The lazy dog jumps over the quick brown fox.
					</Text>
				))}
			</Example>
		</Stack>
	)
}

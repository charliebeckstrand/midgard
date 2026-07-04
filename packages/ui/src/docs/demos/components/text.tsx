import { Text } from '../../../components/text'
import { Example } from '../../engine'

const severities = ['default', 'primary', 'success', 'warning', 'error', 'muted'] as const

const sizes = ['sm', 'md', 'lg'] as const

export function Demo() {
	return (
		<>
			<Example title="Severity">
				{severities.map((severity) => (
					<Text key={severity} severity={severity}>
						{severity} - The lazy dog jumps over the quick brown fox.
					</Text>
				))}
			</Example>

			<Example title="Size">
				{sizes.map((size) => (
					<Text key={size} size={size}>
						{size} - The lazy dog jumps over the quick brown fox.
					</Text>
				))}
			</Example>
		</>
	)
}

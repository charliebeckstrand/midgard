import { Text } from '../../components/text'
import { Example } from '../components/example'

const severities = ['default', 'primary', 'success', 'warning', 'error', 'muted'] as const

export function Demo() {
	return (
		<Example title="Severity">
			{severities.map((severity) => (
				<Text key={severity} severity={severity}>
					{severity} - The lazy dog jumps over the quick brown fox.
				</Text>
			))}
		</Example>
	)
}

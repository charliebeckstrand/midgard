import { Flex } from 'ui/flex'
import { ProgressGauge } from 'ui/progress'

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export default function Size() {
	return (
		<Flex gap="md" align="center" wrap>
			{sizes.map((size) => (
				<ProgressGauge key={size} size={size} value={75} aria-label="Upload progress" />
			))}
		</Flex>
	)
}

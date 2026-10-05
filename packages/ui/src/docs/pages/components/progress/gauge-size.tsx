import { Flex } from 'ui/flex'
import { ProgressGauge } from 'ui/progress'

const sizes = ['sm', 'md', 'lg'] as const

export default function GaugeSize() {
	return (
		<Flex gap="md" align="center">
			{sizes.map((size) => (
				<ProgressGauge key={size} size={size} value={75} aria-label="Progress" />
			))}
		</Flex>
	)
}

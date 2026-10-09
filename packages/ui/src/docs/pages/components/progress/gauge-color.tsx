import { Flex } from 'ui/flex'
import { ProgressGauge } from 'ui/progress'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export default function GaugeColor() {
	return (
		<Flex gap="md" align="center" wrap>
			{colors.map((color) => (
				<ProgressGauge key={color} color={color} value={75} aria-label={`Progress, ${color}`} />
			))}
		</Flex>
	)
}

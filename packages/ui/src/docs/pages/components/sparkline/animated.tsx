import { Flex } from 'ui/flex'
import { Sparkline } from 'ui/sparkline'
import { series } from './series.ts'

export default function Animated() {
	return (
		<Flex wrap gap="lg" align="center">
			<Sparkline
				data={series}
				color="blue"
				fill
				endPoint
				animate
				aria-label="Weekly signups, up over 12 weeks"
			/>
			<Sparkline
				data={series}
				shape="bar"
				color="amber"
				animate
				aria-label="Weekly orders, up over 12 weeks"
			/>
		</Flex>
	)
}

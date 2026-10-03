import { Sparkline } from '../../../components/sparkline'
import { Flex } from '../../../structure/flex'
import { Axes, code, Example } from '../../engine'

// A rising then cresting series so line, area, and bar variants all read clearly.
const series = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 22, 20]

export function Demo() {
	return (
		<>
			<Axes
				of="Sparkline"
				omit={['animate']}
				render={(props, label) => (
					<Sparkline {...props} data={series} aria-label={`${label} trend`} />
				)}
			/>

			<Example
				title="Animated"
				replay
				code={code`
					<Sparkline fill endPoint animate />
					<Sparkline shape="bar" animate />
				`}
			>
				<Flex wrap gap="lg" align="center">
					<Sparkline data={series} color="blue" fill endPoint animate aria-label="Animated trend" />
					<Sparkline data={series} shape="bar" color="amber" animate aria-label="Animated bars" />
				</Flex>
			</Example>
		</>
	)
}

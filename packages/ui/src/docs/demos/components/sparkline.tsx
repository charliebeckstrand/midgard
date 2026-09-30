import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Sparkline } from '../../../components/sparkline'
import { Flex } from '../../../structure/flex'
import { Axes, code, Example } from '../../engine'

// A rising then cresting series so line, area, and bar variants all read clearly.
const series = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 22, 20]

// The mount animation plays once. The refresh button remounts the sparklines
// (it bumps their `key`), so the reveal plays again on demand.
function AnimatedExample() {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title="Animated"
			code={code`
				<Sparkline fill endPoint animate />
				<Sparkline shape="bar" animate />
			`}
			actions={
				<Button
					variant="bare"
					aria-label="Replay animation"
					onClick={() => setRunKey((n) => n + 1)}
				>
					<Icon icon={<RefreshCw />} />
				</Button>
			}
		>
			<Flex wrap gap="lg" align="center">
				<Sparkline
					key={`line-${runKey}`}
					data={series}
					color="blue"
					fill
					endPoint
					animate
					aria-label="Animated trend"
				/>
				<Sparkline
					key={`bar-${runKey}`}
					data={series}
					shape="bar"
					color="amber"
					animate
					aria-label="Animated bars"
				/>
			</Flex>
		</Example>
	)
}

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

			<AnimatedExample />
		</>
	)
}

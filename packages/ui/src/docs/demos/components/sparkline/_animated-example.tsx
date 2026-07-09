import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Sparkline } from '../../../../components/sparkline'
import type { Color } from '../../../../core/recipe'
import { code, Example } from '../../../engine'
import { series } from './_data'

// The mount animation plays once; a refresh button remounts the sparkline (bumping
// its `key`) so the reveal replays on demand. Shared by the line and bar tabs.
export function AnimatedExample({ variant, color }: { variant: 'line' | 'bar'; color: Color }) {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title="Animated"
			code={
				variant === 'bar'
					? code`<Sparkline variant="bar" animate />`
					: code`<Sparkline fill endPoint animate />`
			}
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
			{variant === 'bar' ? (
				<Sparkline
					key={runKey}
					data={series}
					variant="bar"
					color={color}
					animate
					aria-label="Animated bars"
				/>
			) : (
				<Sparkline
					key={runKey}
					data={series}
					color={color}
					fill
					endPoint
					animate
					aria-label="Animated trend"
				/>
			)}
		</Example>
	)
}

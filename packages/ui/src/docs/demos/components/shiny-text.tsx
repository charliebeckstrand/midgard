import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { ShinyText } from '../../../components/shiny-text'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example, ValueStepper } from '../../engine'

const palettes = [
	{ name: 'Zinc', color: 'var(--color-zinc-600)', shineColor: 'var(--color-white)' },
	{ name: 'Amber', color: 'var(--color-amber-600)', shineColor: 'var(--color-amber-200)' },
	{ name: 'Violet', color: 'var(--color-violet-600)', shineColor: 'var(--color-violet-200)' },
	{ name: 'Sky', color: 'var(--color-sky-600)', shineColor: 'var(--color-sky-200)' },
] as const

const spreads = [40, 120, 200] as const

function SpeedExample() {
	const [speed, setSpeed] = useState(2)

	return (
		<Example
			title="Speed"
			actions={
				<ValueStepper label="speed" value={speed} min={1} max={6} onValueChange={setSpeed} />
			}
			prefix={
				<Badge color="zinc" className="tabular-nums">
					{speed}s
				</Badge>
			}
		>
			<Stack gap="sm" align="start">
				<ShinyText speed={speed} className="text-3xl font-semibold">
					Seconds per sweep
				</ShinyText>
			</Stack>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="ShinyText"
				captions={false}
				render={(props, label) => (
					<ShinyText {...props} className="text-3xl font-semibold">
						{label}
					</ShinyText>
				)}
			/>

			<SpeedExample />

			<Example title="Colors">
				<Stack gap="sm" align="start">
					{palettes.map((palette) => (
						<ShinyText
							key={palette.name}
							color={palette.color}
							shineColor={palette.shineColor}
							className="text-3xl font-semibold"
						>
							{palette.name}
						</ShinyText>
					))}
				</Stack>
			</Example>

			<Example title="Spread">
				<Flex gap="lg" wrap>
					{spreads.map((spread) => (
						<ShinyText key={spread} spread={spread} className="text-3xl font-semibold tabular-nums">
							{spread}°
						</ShinyText>
					))}
				</Flex>
			</Example>
		</>
	)
}

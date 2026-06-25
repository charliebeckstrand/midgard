import { Example, ValueStepper, VariantListbox } from 'docs'
import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Badge } from '../../components/badge'
import { Flex } from '../../components/flex'
import { ShinyText } from '../../components/shiny-text'
import { Stack } from '../../components/stack'

const directions = ['left', 'right'] as const

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
			actions={<ValueStepper value={speed} min={1} max={6} onValueChange={setSpeed} />}
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

function DirectionExample() {
	const [direction, setDirection] = useState<(typeof directions)[number]>('left')

	return (
		<Example
			title="Direction"
			actions={
				<VariantListbox variants={directions} value={direction} onValueChange={setDirection} />
			}
		>
			<ShinyText direction={direction} className="text-3xl font-semibold">
				Sweep {direction}
			</ShinyText>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<ShinyText className="text-3xl font-bold">Shiny Text</ShinyText>
			</Example>

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

			<DirectionExample />

			<Example title="Spread">
				<Flex gap="lg" wrap>
					{spreads.map((spread) => (
						<ShinyText key={spread} spread={spread} className="text-3xl font-semibold tabular-nums">
							{spread}°
						</ShinyText>
					))}
				</Flex>
			</Example>

			<Example title="Yoyo">
				<ShinyText yoyo className="text-3xl font-semibold">
					Back and forth
				</ShinyText>
			</Example>

			<Example
				title="Pause on hover"
				prefix={<Alert severity="info">The sweep halts while the pointer is over the text.</Alert>}
			>
				<Stack gap="sm" align="start">
					<ShinyText pauseOnHover className="text-3xl font-semibold">
						Hover to pause
					</ShinyText>
				</Stack>
			</Example>

			<Example title="Disabled">
				<ShinyText disabled className="text-3xl font-semibold">
					No shine
				</ShinyText>
			</Example>
		</>
	)
}

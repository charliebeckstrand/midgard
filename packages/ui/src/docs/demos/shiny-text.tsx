import { useState } from 'react'
import { Flex } from '../../components/flex'
import { ShinyText } from '../../components/shiny-text'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const directions = ['left', 'right'] as const

const palettes = [
	{ name: 'Silver', color: 'var(--color-zinc-500)', shineColor: 'var(--color-white)' },
	{ name: 'Gold', color: 'var(--color-amber-500)', shineColor: 'var(--color-amber-200)' },
	{ name: 'Iris', color: 'var(--color-violet-500)', shineColor: 'var(--color-violet-200)' },
	{ name: 'Sky', color: 'var(--color-sky-500)', shineColor: 'var(--color-sky-200)' },
] as const

const spreads = [40, 120, 200] as const

function SpeedExample() {
	const [speed, setSpeed] = useState(2)

	return (
		<Example
			title="Speed"
			actions={<ValueStepper value={speed} min={1} max={6} onValueChange={setSpeed} />}
			prefix={
				<Text variant="muted" className="tabular-nums">
					speed = {speed}s
				</Text>
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
				<ShinyText className="text-4xl font-bold">Shiny Text</ShinyText>
			</Example>

			<SpeedExample />

			<Example
				title="Colors"
				code={code`
					<ShinyText color="var(--color-amber-500)" shineColor="var(--color-amber-200)">
						Gold
					</ShinyText>
				`}
			>
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

			<Example
				title="Spread"
				code={code`
					<ShinyText spread={200}>Wide angle</ShinyText>
				`}
			>
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
				prefix={<Text variant="muted">The sweep halts while the pointer is over the text.</Text>}
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

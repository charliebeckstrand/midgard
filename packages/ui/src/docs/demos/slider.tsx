'use client'

import { useState } from 'react'
import { Flex } from '../../components/flex'
import { RangeSlider, Slider } from '../../components/slider'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'

export const meta = { category: 'Forms' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['sm', 'md', 'lg'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Interactive() {
	const [value, setValue] = useState(50)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
		>
			<Slider value={value} onChange={setValue} />
			<Text className="tabular-nums">{value}</Text>
		</Example>
	)
}

function StepSliderDemo() {
	const [ratio, setRatio] = useState(0.5)

	return (
		<Example title="Step">
			<Slider min={0} max={1} step={0.1} value={ratio} onChange={setRatio} color="red" />
			<Text className="tabular-nums">{ratio.toFixed(1)}</Text>
		</Example>
	)
}

function RangeSliderDemo() {
	const [range, setRange] = useState<[number, number]>([25, 75])

	return (
		<Example title="Range">
			<RangeSlider value={range} onChange={setRange} color="amber" />
			<Text className="tabular-nums">
				{range[0]} – {range[1]}
			</Text>
		</Example>
	)
}

function RangeStepSliderDemo() {
	const [range, setRange] = useState<[number, number]>([0.25, 0.75])

	return (
		<Example title="Range with steps">
			<RangeSlider min={0} max={1} step={0.1} value={range} onChange={setRange} color="green" />
			<Text className="tabular-nums">
				{range[0].toFixed(1)} – {range[1].toFixed(1)}
			</Text>
		</Example>
	)
}

export default function SliderDemo() {
	return (
		<Stack gap="xl">
			<Interactive />

			<Example title="Sizes">
				{sizes.map((s, i) => (
					<Flex key={s} gap="md">
						<span className="w-6 text-xs text-zinc-500">{s}</span>
						<Slider size={s} defaultValue={40 + i * 20} className="flex-1" />
					</Flex>
				))}
			</Example>

			<Example title="Colors">
				{colors.map((color, index) => (
					<Flex key={color} gap="md">
						<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
						<Slider color={color} defaultValue={40 + index * 10} className="flex-1" />
					</Flex>
				))}
			</Example>

			<StepSliderDemo />

			<RangeSliderDemo />

			<RangeStepSliderDemo />

			<Example title="Disabled">
				<Slider disabled defaultValue={40} />
			</Example>
		</Stack>
	)
}

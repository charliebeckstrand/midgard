'use client'

import { useState } from 'react'
import { Flex } from '../../components/flex'
import { Sizer } from '../../components/sizer'
import { Slider } from '../../components/slider'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'

export const meta = { category: 'Forms' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['sm', 'md', 'lg'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Interactive() {
	const [value, setValue] = useState(40)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
		>
			<Sizer gap={3}>
				<Slider value={value} onChange={setValue} />
				<Text className="tabular-nums">{value}</Text>
			</Sizer>
		</Example>
	)
}

function RangeAndStep() {
	const [ratio, setRatio] = useState(0.5)
	const [signed, setSigned] = useState(0)

	return (
		<Example
			title="Range and step"
			actions={
				<Stack gap={1} align="end">
					<ValueStepper value={ratio} onChange={setRatio} min={0} max={1} step={0.1} />
					<ValueStepper value={signed} onChange={setSigned} min={-50} max={50} step={5} />
				</Stack>
			}
		>
			<Sizer>
				<Slider min={0} max={1} step={0.1} value={ratio} onChange={setRatio} color="green" />
				<Slider min={-50} max={50} step={5} value={signed} onChange={setSigned} color="amber" />
			</Sizer>
		</Example>
	)
}

export default function SliderDemo() {
	return (
		<Stack gap={6}>
			<Interactive />

			<Example title="Sizes">
				<Sizer>
					{sizes.map((s, i) => (
						<Flex key={s} gap={3}>
							<span className="w-6 text-xs text-zinc-500">{s}</span>
							<Slider size={s} defaultValue={40 + i * 20} className="flex-1" />
						</Flex>
					))}
				</Sizer>
			</Example>

			<Example title="Colors">
				<Sizer>
					{colors.map((color) => (
						<Flex key={color} gap={3}>
							<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
							<Slider color={color} defaultValue={60} className="flex-1" />
						</Flex>
					))}
				</Sizer>
			</Example>

			<RangeAndStep />

			<Example title="Disabled">
				<Sizer>
					<Slider disabled defaultValue={40} />
				</Sizer>
			</Example>
		</Stack>
	)
}

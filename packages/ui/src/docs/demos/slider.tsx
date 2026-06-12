import { useState } from 'react'
import { RangeSlider, Slider } from '../../components/slider'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { capitalize } from '../components/format'
import { LabeledRow } from '../components/labeled'
import { ValueStepper } from '../components/value-stepper'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['sm', 'md', 'lg'] as const

function InteractiveExample() {
	const [value, setValue] = useState(50)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onValueChange={setValue} max={100} step={10} />}
		>
			<Slider aria-label="Value" value={value} onValueChange={setValue} />
			<Text className="tabular-nums">{value}</Text>
		</Example>
	)
}

function StepSliderExample() {
	const [ratio, setRatio] = useState(0.5)

	return (
		<>
			{' '}
			<Slider
				aria-label="Ratio"
				min={0}
				max={1}
				step={0.1}
				value={ratio}
				onValueChange={setRatio}
				color="red"
			/>
			<Text className="tabular-nums">{ratio.toFixed(1)}</Text>
		</>
	)
}

function RangeSliderExample() {
	const [range, setRange] = useState<[number, number]>([25, 75])

	return (
		<>
			<RangeSlider value={range} onValueChange={setRange} color="amber" />
			<Text className="tabular-nums">
				{range[0]} – {range[1]}
			</Text>
		</>
	)
}

function RangeStepSliderExample() {
	const [rangeClamped, setRangeClamped] = useState<[number, number]>([0.3, 0.7])
	const [rangeSwap, setRangeSwap] = useState<[number, number]>([0.3, 0.7])

	return (
		<>
			<Stack gap="sm">
				<Text>Clamped</Text>

				<RangeSlider
					min={0}
					max={1}
					step={0.1}
					value={rangeClamped}
					allowCross={false}
					onValueChange={setRangeClamped}
					color="green"
				/>

				<Text className="tabular-nums">
					{rangeClamped[0].toFixed(1)} – {rangeClamped[1].toFixed(1)}
				</Text>
			</Stack>

			<Stack gap="sm">
				<Text className="mt-lg">Swap</Text>

				<RangeSlider
					min={0}
					max={1}
					step={0.1}
					value={rangeSwap}
					allowCross={true}
					onValueChange={setRangeSwap}
					color="green"
				/>

				<Text className="tabular-nums">
					{rangeSwap[0].toFixed(1)} – {rangeSwap[1].toFixed(1)}
				</Text>
			</Stack>
		</>
	)
}

export function Demo() {
	return (
		<>
			<InteractiveExample />

			<Example title="Sizes">
				{sizes.map((s, i) => (
					<LabeledRow key={s} label={s}>
						<Slider aria-label={s} size={s} defaultValue={40 + i * 20} className="flex-1" />
					</LabeledRow>
				))}
			</Example>

			<Example title="Colors">
				{colors.map((color, index) => (
					<LabeledRow key={color} label={capitalize(color)} labelWidth="md">
						<Slider
							aria-label={capitalize(color)}
							color={color}
							defaultValue={40 + index * 10}
							className="flex-1"
						/>
					</LabeledRow>
				))}
			</Example>

			<Example title="Step">
				<StepSliderExample />
			</Example>

			<Example title="Range">
				<RangeSliderExample />
			</Example>

			<Example title="Range with steps">
				<RangeStepSliderExample />
			</Example>

			<Example title="Disabled">
				<Slider aria-label="Disabled" disabled defaultValue={50} />
			</Example>
		</>
	)
}

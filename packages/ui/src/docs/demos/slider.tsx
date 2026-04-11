'use client'

import { useState } from 'react'
import { Slider } from '../../components/slider'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../example'
import { ValueStepper } from '../value-stepper'

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
			code={code`
				import { Slider } from 'ui/slider'

				const [value, setValue] = useState(40)

				<Slider value={value} onChange={setValue} />
			`}
		>
			<div className="space-y-3 lg:max-w-sm">
				<Slider value={value} onChange={setValue} />
				<Text className="tabular-nums">{value}</Text>
			</div>
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
				<div className="flex flex-col items-end gap-1">
					<ValueStepper value={ratio} onChange={setRatio} min={0} max={1} step={0.1} />
					<ValueStepper value={signed} onChange={setSigned} min={-50} max={50} step={5} />
				</div>
			}
			code={code`
				import { Slider } from 'ui/slider'

				<Slider min={0} max={1} step={0.1} value={ratio} onChange={setRatio} />
				<Slider min={-50} max={50} step={5} value={signed} onChange={setSigned} />
			`}
		>
			<div className="flex lg:max-w-sm flex-col gap-4">
				<Slider min={0} max={1} step={0.1} value={ratio} onChange={setRatio} color="green" />
				<Slider min={-50} max={50} step={5} value={signed} onChange={setSigned} color="amber" />
			</div>
		</Example>
	)
}

export default function SliderDemo() {
	return (
		<div className="space-y-8">
			<Interactive />
			<Example
				title="Sizes"
				code={code`
					import { Slider } from 'ui/slider'

					<Slider size="sm" defaultValue={40} />
					<Slider size="md" defaultValue={60} />
					<Slider size="lg" defaultValue={80} />
				`}
			>
				<div className="flex lg:max-w-sm flex-col gap-4">
					{sizes.map((s, i) => (
						<div key={s} className="flex items-center gap-3">
							<span className="w-6 text-xs text-zinc-500">{s}</span>
							<Slider size={s} defaultValue={40 + i * 20} className="flex-1" />
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				code={code`
					import { Slider } from 'ui/slider'

					${colors.map((c) => `<Slider color="${c}" defaultValue={60} />`)}
				`}
			>
				<div className="flex lg:max-w-sm flex-col gap-4">
					{colors.map((color) => (
						<div key={color} className="flex items-center gap-3">
							<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
							<Slider color={color} defaultValue={60} className="flex-1" />
						</div>
					))}
				</div>
			</Example>
			<RangeAndStep />
			<Example
				title="Disabled"
				code={code`
					import { Slider } from 'ui/slider'

					<Slider disabled defaultValue={40} />
				`}
			>
				<div className="lg:max-w-sm">
					<Slider disabled defaultValue={40} />
				</div>
			</Example>
		</div>
	)
}

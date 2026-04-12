'use client'

import { useState } from 'react'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { Sizer } from '../../components/sizer'
import { code } from '../code'
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'

export const meta = { category: 'Feedback' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const barSizes = ['sm', 'md', 'lg'] as const

const gaugeSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function InteractiveBar() {
	const [value, setValue] = useState(60)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
			code={code`
				import { ProgressBar } from 'ui/progress'

				<ProgressBar value={60} />
			`}
		>
			<Sizer>
				<ProgressBar value={value} />
			</Sizer>
		</Example>
	)
}

function InteractiveGauge() {
	const [value, setValue] = useState(60)

	return (
		<Example
			title="Gauge"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
			code={code`
				import { ProgressGauge } from 'ui/progress'

				<ProgressGauge value={60} />
			`}
		>
			<ProgressGauge value={value} size="lg" />
		</Example>
	)
}

export default function ProgressDemo() {
	return (
		<div className="space-y-8">
			<InteractiveBar />
			<Example title="Bar sizes">
				<Sizer>
					{barSizes.map((s) => (
						<div key={s} className="flex items-center gap-3">
							<span className="w-6 text-xs text-zinc-500">{s}</span>
							<ProgressBar size={s} value={60} className="flex-1" />
						</div>
					))}
				</Sizer>
			</Example>
			<Example title="Bar colors">
				<Sizer>
					{colors.map((color) => (
						<div key={color} className="flex items-center gap-3">
							<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
							<ProgressBar color={color} value={60} className="flex-1" />
						</div>
					))}
				</Sizer>
			</Example>
			<InteractiveGauge />
			<Example title="Gauge sizes">
				<div className="flex items-end gap-4">
					{gaugeSizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<ProgressGauge value={75} size={s} color="amber" />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example title="Gauge with label">
				<div className="flex items-end gap-4">
					{gaugeSizes.map((s) => (
						<ProgressGauge
							key={s}
							value={s === 'xs' ? 60 : 80}
							size={s}
							color="green"
							label={s !== 'xs'}
						/>
					))}
					<ProgressGauge value={100} size="xl" color="green" label />
				</div>
			</Example>
			<Example title="Gauge colors">
				<div className="flex items-center gap-4">
					{colors.map((color) => (
						<ProgressGauge key={color} color={color} value={75} size="lg" />
					))}
				</div>
			</Example>
		</div>
	)
}

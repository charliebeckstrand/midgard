'use client'

import { useState } from 'react'
import { Flex } from '../../components/flex'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
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
		<Stack gap={8}>
			<InteractiveBar />

			<Example title="Bar sizes">
				<Sizer>
					{barSizes.map((s) => (
						<Flex key={s} gap={3}>
							<span className="w-6 text-xs text-zinc-500">{s}</span>
							<ProgressBar size={s} value={60} className="flex-1" />
						</Flex>
					))}
				</Sizer>
			</Example>

			<Example title="Bar colors">
				<Sizer>
					{colors.map((color) => (
						<Flex key={color} gap={3}>
							<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
							<ProgressBar color={color} value={60} className="flex-1" />
						</Flex>
					))}
				</Sizer>
			</Example>

			<InteractiveGauge />

			<Example title="Gauge sizes">
				<Flex gap={4} align="end">
					{gaugeSizes.map((s) => (
						<Stack key={s} gap={2} align="center">
							<ProgressGauge value={75} size={s} color="amber" />
							<span className="text-xs text-zinc-500">{s}</span>
						</Stack>
					))}
				</Flex>
			</Example>

			<Example title="Gauge with label">
				<Flex gap={4} align="end">
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
				</Flex>
			</Example>

			<Example title="Gauge colors">
				<Flex gap={4}>
					{colors.map((color) => (
						<ProgressGauge key={color} color={color} value={75} size="lg" />
					))}
				</Flex>
			</Example>
		</Stack>
	)
}

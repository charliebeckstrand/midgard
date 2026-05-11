'use client'

import { useState } from 'react'
import { Flex } from '../../components/flex'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { Stack } from '../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { code } from '../code'
import { Example } from '../components/example'
import { ValueStepper } from '../components/value-stepper'

export const meta = { category: 'Feedback' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const barSizes = ['sm', 'md', 'lg'] as const

const gaugeSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function InteractiveBarExample() {
	const [value, setValue] = useState(50)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
		>
			<ProgressBar value={value} aria-label="Progress" />
		</Example>
	)
}

function InteractiveGaugeExample() {
	const [value, setValue] = useState(50)

	return (
		<Example
			title="Default"
			actions={<ValueStepper value={value} onChange={setValue} max={100} step={10} />}
			code={code`
				import { ProgressGauge } from 'ui/progress'

				<ProgressGauge value={50} aria-label="Progress" />
			`}
		>
			<ProgressGauge value={value} size="lg" aria-label="Progress" />
		</Example>
	)
}

export default function ProgressDemo() {
	return (
		<Tabs defaultValue="bar">
			<Stack gap="lg">
				<TabList>
					<Tab value="bar">Bar</Tab>
					<Tab value="gauge">Gauge</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<InteractiveBarExample />

							<Example title="Sizes">
								{barSizes.map((s, i) => (
									<Flex key={s} gap="md">
										<span className="w-6 text-xs text-zinc-500">{s}</span>
										<ProgressBar
											size={s}
											value={40 + i * 10}
											className="flex-1"
											aria-label={`${s} progress`}
										/>
									</Flex>
								))}
							</Example>

							<Example title="Colors">
								{colors.map((color) => (
									<Flex key={color} gap="md">
										<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
										<ProgressBar
											color={color}
											value={75}
											className="flex-1"
											aria-label={`${cap(color)} progress`}
										/>
									</Flex>
								))}
							</Example>
						</Stack>
					</TabContent>
					<TabContent value="gauge">
						<Stack gap="xl">
							<InteractiveGaugeExample />

							<Example title="Colors">
								<Flex gap="lg">
									{colors.map((color) => (
										<ProgressGauge
											key={color}
											color={color}
											value={75}
											size="lg"
											aria-label={`${cap(color)} progress`}
										/>
									))}
								</Flex>
							</Example>

							<Example title="Sizes">
								<Flex gap="lg" align="end">
									{gaugeSizes.map((s) => (
										<Stack key={s} gap="sm" align="center">
											<ProgressGauge value={75} size={s} color="red" aria-label={`${s} progress`} />
											<span className="text-xs text-zinc-500">{s}</span>
										</Stack>
									))}
								</Flex>
							</Example>

							<Example title="With label">
								<Flex gap="lg" align="end">
									{gaugeSizes.map((s) => (
										<ProgressGauge
											key={s}
											value={s === 'xs' ? 60 : 80}
											size={s}
											color="amber"
											label={s !== 'xs'}
											aria-label={`${s} progress`}
										/>
									))}
									<ProgressGauge value={100} size="xl" color="amber" label aria-label="Complete" />
								</Flex>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}

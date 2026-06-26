import { useState } from 'react'
import { Flex } from '../../components/flex'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { Stack } from '../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import {
	capitalize,
	Example,
	LabeledColumn,
	LabeledRow,
	LabeledRows,
	ValueStepper,
} from '../engine'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const barSizes = ['sm', 'md', 'lg'] as const

const gaugeSizes = ['sm', 'md', 'lg', 'xl'] as const

export function Demo() {
	const [barValue, setBarValue] = useState(50)
	const [gaugeValue, setGaugeValue] = useState(50)

	return (
		<Tabs defaultValue="bar">
			<Stack gap="lg">
				<TabList aria-label="Progress style">
					<Tab value="bar">Bar</Tab>
					<Tab value="gauge">Gauge</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Example
								title="Default"
								actions={
									<ValueStepper value={barValue} onValueChange={setBarValue} max={100} step={10} />
								}
							>
								<ProgressBar value={barValue} aria-label="Progress" />
							</Example>

							<Example title="Colors">
								<LabeledRows>
									{colors.map((color, i) => (
										<LabeledRow key={color} label={capitalize(color)}>
											<ProgressBar
												color={color}
												value={50 + i * 12.5}
												className="flex-1"
												aria-label={`${capitalize(color)} progress`}
											/>
										</LabeledRow>
									))}
								</LabeledRows>
							</Example>

							<Example title="Sizes">
								<LabeledRows>
									{barSizes.map((s, i) => (
										<LabeledRow key={s} label={s}>
											<ProgressBar
												size={s}
												color="red"
												value={40 + i * 10}
												className="flex-1"
												aria-label={`${s} progress`}
											/>
										</LabeledRow>
									))}
								</LabeledRows>
							</Example>
						</Stack>
					</TabContent>
					<TabContent value="gauge">
						<Stack gap="xl">
							<Example
								title="Default"
								actions={
									<ValueStepper
										value={gaugeValue}
										onValueChange={setGaugeValue}
										max={100}
										step={10}
									/>
								}
							>
								<ProgressGauge value={gaugeValue} aria-label="Progress" />
							</Example>

							<Example title="Colors">
								<Flex gap="lg">
									{colors.map((color, i) => (
										<ProgressGauge
											key={color}
											color={color}
											value={50 + i * 12.5}
											aria-label={`${capitalize(color)} progress`}
										/>
									))}
								</Flex>
							</Example>

							<Example title="Sizes">
								<Flex gap="lg" align="end">
									{gaugeSizes.map((s) => (
										<LabeledColumn key={s} label={s}>
											<ProgressGauge value={75} size={s} color="red" aria-label={`${s} progress`} />
										</LabeledColumn>
									))}
								</Flex>
							</Example>

							<Example title="With label">
								<Flex gap="lg" align="end">
									{gaugeSizes.map((s) => (
										<ProgressGauge
											key={s}
											value={80}
											size={s}
											color="amber"
											label
											aria-label={`${s} progress`}
										/>
									))}
								</Flex>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}

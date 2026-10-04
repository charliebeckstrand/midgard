import { useState } from 'react'
import { ProgressBar, ProgressGauge } from '../../../components/progress'
import { Tab, TabContent, TabContents, TabList } from '../../../components/tabs'
import { Stack } from '../../../structure/stack'
import { Axes, Example, PageTabs, ValueStepper } from '../../engine'

export default function Demo() {
	const [barValue, setBarValue] = useState(50)
	const [gaugeValue, setGaugeValue] = useState(50)

	return (
		<PageTabs defaultValue="bar">
			<Stack gap="lg">
				<TabList aria-label="Progress style">
					<Tab value="bar">Bar</Tab>
					<Tab value="gauge">Gauge</Tab>
				</TabList>
				<TabContents>
					<TabContent value="bar">
						<Stack gap="xl">
							<Axes
								of="ProgressBar"
								render={(props, label) => (
									<ProgressBar {...props} value={60} aria-label={`${label} progress`} />
								)}
							/>

							<Example
								title="Value"
								actions={
									<ValueStepper
										label="progress"
										value={barValue}
										onValueChange={setBarValue}
										max={100}
										step={10}
									/>
								}
							>
								<ProgressBar value={barValue} aria-label="Progress" />
							</Example>
						</Stack>
					</TabContent>
					<TabContent value="gauge">
						<Stack gap="xl">
							<Axes
								of="ProgressGauge"
								render={(props, label) => (
									<ProgressGauge {...props} value={75} aria-label={`${label} progress`} />
								)}
							/>

							<Example
								title="Value"
								actions={
									<ValueStepper
										label="progress"
										value={gaugeValue}
										onValueChange={setGaugeValue}
										max={100}
										step={10}
									/>
								}
							>
								<ProgressGauge value={gaugeValue} aria-label="Progress" />
							</Example>

							<Example title="With label">
								<ProgressGauge
									value={80}
									size="lg"
									color="amber"
									centerLabel
									aria-label="Progress"
								/>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</PageTabs>
	)
}

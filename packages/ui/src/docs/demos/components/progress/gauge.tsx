import { useState } from 'react'
import { Flex } from '../../../../components/flex'
import { ProgressGauge } from '../../../../components/progress'
import { Stack } from '../../../../components/stack'
import { capitalize, Example, LabeledColumn, ValueStepper } from '../../../engine'
import { colors } from './_data'

const gaugeSizes = ['sm', 'md', 'lg', 'xl'] as const

export function Demo() {
	const [gaugeValue, setGaugeValue] = useState(50)

	return (
		<Stack gap="xl">
			<Example
				title="Default"
				actions={
					<ValueStepper value={gaugeValue} onValueChange={setGaugeValue} max={100} step={10} />
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
	)
}

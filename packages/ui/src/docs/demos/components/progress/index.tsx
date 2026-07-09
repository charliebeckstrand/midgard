import { useState } from 'react'
import { ProgressBar } from '../../../../components/progress'
import { Stack } from '../../../../components/stack'
import { capitalize, Example, LabeledRow, LabeledRows, ValueStepper } from '../../../engine'
import { colors } from './_data'

const barSizes = ['sm', 'md', 'lg'] as const

export function Demo() {
	const [barValue, setBarValue] = useState(50)

	return (
		<Stack gap="xl">
			<Example
				title="Default"
				actions={<ValueStepper value={barValue} onValueChange={setBarValue} max={100} step={10} />}
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
	)
}

import { Sparkline } from '../../../../components/sparkline'
import { Stack } from '../../../../components/stack'
import { capitalize, Example, LabeledRow, LabeledRows } from '../../../engine'
import { AnimatedExample } from './_animated-example'
import { colors, series, sizes } from './_data'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Sparkline data={series} variant="bar" color="blue" aria-label="By period" />
			</Example>

			<Example title="Colors">
				<LabeledRows>
					{colors.map((color) => (
						<LabeledRow key={color} label={capitalize(color)}>
							<Sparkline
								data={series}
								variant="bar"
								color={color}
								aria-label={`${capitalize(color)} bars`}
							/>
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<Example title="Sizes">
				<LabeledRows>
					{sizes.map((s) => (
						<LabeledRow key={s} label={s}>
							<Sparkline
								data={series}
								variant="bar"
								size={s}
								color="red"
								aria-label={`${s} bars`}
							/>
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<AnimatedExample variant="bar" color="amber" />
		</Stack>
	)
}

import { Sparkline } from '../../../../components/sparkline'
import { Stack } from '../../../../components/stack'
import { capitalize, Example, LabeledRow, LabeledRows } from '../../../engine'
import { AnimatedExample } from './_animated-example'
import { colors, series, sizes } from './_data'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Sparkline data={series} aria-label="Trend" />
			</Example>

			<Example title="Colors">
				<LabeledRows>
					{colors.map((color) => (
						<LabeledRow key={color} label={capitalize(color)}>
							<Sparkline
								data={series}
								color={color}
								fill
								aria-label={`${capitalize(color)} trend`}
							/>
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<Example title="Sizes">
				<LabeledRows>
					{sizes.map((s) => (
						<LabeledRow key={s} label={s}>
							<Sparkline data={series} size={s} color="red" aria-label={`${s} trend`} />
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<Example title="End-point">
				<Sparkline
					data={series}
					color="amber"
					endPoint
					aria-label="Trend with area fill and end-point"
				/>
			</Example>

			<Example title="Area fill">
				<Sparkline
					data={series}
					color="green"
					fill
					aria-label="Trend with area fill and end-point"
				/>
			</Example>

			<AnimatedExample variant="line" color="blue" />
		</Stack>
	)
}

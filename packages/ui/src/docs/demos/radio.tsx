import { Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const plans = ['Starter', 'Business', 'Enterprise']
const colors = ['blue', 'green', 'red'] as const

export default function RadioDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<RadioGroup>
					{plans.map((plan) => (
						<RadioField key={plan}>
							<Radio
								id={`radio-${plan.toLowerCase()}`}
								name="plan"
								value={plan}
								defaultChecked={plan === 'Starter'}
							/>
							<Label htmlFor={`radio-${plan.toLowerCase()}`}>{plan}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example title="Colors">
				<RadioGroup>
					{colors.map((color) => (
						<RadioField key={color}>
							<Radio
								id={`radio-${color}`}
								name="color"
								value={color}
								color={color}
								defaultChecked={color === 'blue'}
							/>
							<Label htmlFor={`radio-${color}`}>{color}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example title="Disabled">
				<RadioGroup>
					<RadioField>
						<Radio id="radio-enabled" name="option" value="enabled" defaultChecked disabled />
						<Label htmlFor="radio-enabled">Enabled option</Label>
					</RadioField>
					<RadioField>
						<Radio id="radio-disabled" name="option" value="disabled" disabled />
						<Label htmlFor="radio-disabled">Disabled option</Label>
					</RadioField>
				</RadioGroup>
			</Example>
		</Stack>
	)
}

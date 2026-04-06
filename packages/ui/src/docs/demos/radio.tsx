import { Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'

export const meta = { category: 'Forms' }

const plans = ['Starter', 'Business', 'Enterprise']
const colors = ['blue', 'green', 'red'] as const

export default function RadioDemo() {
	return (
		<>
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

			<RadioGroup className="mt-4">
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
		</>
	)
}

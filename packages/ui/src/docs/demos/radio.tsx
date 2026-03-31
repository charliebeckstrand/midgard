import { Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'

export const meta = { category: 'Forms' }

const plans = ['Starter', 'Business', 'Enterprise']

export default function RadioDemo() {
	return (
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
	)
}

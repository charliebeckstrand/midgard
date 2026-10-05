import { Label } from 'ui/fieldset'
import { Radio, RadioField, RadioGroup, type RadioProps } from 'ui/radio'

const plans = ['Starter', 'Business', 'Enterprise']

export default function RadioPlayground(props: RadioProps) {
	return (
		<RadioGroup aria-label="Plan">
			{plans.map((plan) => (
				<RadioField key={plan}>
					<Radio name="plan" value={plan} defaultChecked={plan === 'Starter'} {...props} />
					<Label>{plan}</Label>
				</RadioField>
			))}
		</RadioGroup>
	)
}

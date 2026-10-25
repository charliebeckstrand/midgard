import { Label } from 'ui/fieldset'
import { Radio, RadioField, RadioGroup, type RadioProps } from 'ui/radio'
import { planWords } from './plans.ts'

const plans = Object.values(planWords)

export default function RadioPlayground(props: RadioProps) {
	return (
		<RadioGroup aria-label="Plan">
			{plans.map((plan) => (
				<RadioField key={plan}>
					<Radio name="plan" value={plan} defaultChecked={plan === planWords.starter} {...props} />
					<Label>{plan}</Label>
				</RadioField>
			))}
		</RadioGroup>
	)
}

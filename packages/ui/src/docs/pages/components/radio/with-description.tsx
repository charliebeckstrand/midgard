import { Description, Label } from 'ui/fieldset'
import { Radio, RadioField, RadioGroup } from 'ui/radio'

const speeds = [
	{ value: 'standard', label: 'Standard', description: 'Arrives in 5 to 7 business days.' },
	{ value: 'express', label: 'Express', description: 'Arrives in 2 business days.' },
	{ value: 'overnight', label: 'Overnight', description: 'Arrives on the next business day.' },
]

export default function WithDescription() {
	return (
		<RadioGroup aria-label="Shipping speed">
			{speeds.map((speed) => (
				<RadioField key={speed.value}>
					<Radio name="shipping" value={speed.value} defaultChecked={speed.value === 'standard'} />
					<Label>{speed.label}</Label>
					<Description>{speed.description}</Description>
				</RadioField>
			))}
		</RadioGroup>
	)
}

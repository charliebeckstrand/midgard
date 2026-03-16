import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'

export const meta = { category: 'Forms' }

const plans = ['Starter', 'Business', 'Enterprise']

export default function RadioDemo() {
	const [selected, setSelected] = useState('Starter')

	return (
		<Field>
			<Label>Plan</Label>
			<RadioGroup value={selected} onChange={setSelected}>
				{plans.map((plan) => (
					<RadioField key={plan}>
						<Radio value={plan} />
						<Label>{plan}</Label>
					</RadioField>
				))}
			</RadioGroup>
		</Field>
	)
}

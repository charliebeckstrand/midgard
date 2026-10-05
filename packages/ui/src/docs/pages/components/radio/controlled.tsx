import { useState } from 'react'
import { Label } from 'ui/fieldset'
import { Radio, RadioField, RadioGroup } from 'ui/radio'
import { Text } from 'ui/text'

const frequencies = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'never', label: 'Never' },
]

export default function Controlled() {
	const [frequency, setFrequency] = useState('weekly')

	return (
		<>
			<RadioGroup aria-label="Email digest">
				{frequencies.map((option) => (
					<RadioField key={option.value}>
						<Radio
							name="digest"
							value={option.value}
							checked={frequency === option.value}
							onChange={(event) => setFrequency(event.target.value)}
						/>
						<Label>{option.label}</Label>
					</RadioField>
				))}
			</RadioGroup>
			<Text>Value: {frequency}</Text>
		</>
	)
}

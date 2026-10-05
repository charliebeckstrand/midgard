import { useState } from 'react'
import { CreditCardInput } from 'ui/credit-card-input'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'

export default function Controlled() {
	const [value, setValue] = useState('')

	return (
		<>
			<Field>
				<Label>Card number</Label>
				<CreditCardInput value={value} onValueChange={setValue} />
			</Field>
			<Text>Value: {value || 'Empty'}</Text>
		</>
	)
}

import { useState } from 'react'
import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'

export default function Controlled() {
	const [value, setValue] = useState<number | null>(1234.56)

	return (
		<>
			<Field>
				<Label>Budget</Label>
				<CurrencyInput currency="USD" value={value} onValueChange={setValue} />
			</Field>
			<Text>Value: {value ?? 'Empty'}</Text>
		</>
	)
}

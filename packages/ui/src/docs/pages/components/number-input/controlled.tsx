import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { NumberInput } from 'ui/number-input'
import { Text } from 'ui/text'

export default function Controlled() {
	const [quantity, setQuantity] = useState<number | null>(3)

	return (
		<>
			<Field>
				<Label>Quantity</Label>
				<NumberInput value={quantity} onValueChange={setQuantity} min={0} max={10} />
			</Field>
			<Text>Value: {String(quantity)}</Text>
		</>
	)
}

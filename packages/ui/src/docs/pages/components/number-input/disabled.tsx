import { Field, Label } from 'ui/fieldset'
import { NumberInput } from 'ui/number-input'

export default function Disabled() {
	return (
		<Field>
			<Label>Quantity</Label>
			<NumberInput disabled defaultValue={1} />
		</Field>
	)
}

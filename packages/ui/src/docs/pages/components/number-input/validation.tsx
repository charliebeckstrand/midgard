import { Field, Label, Message } from 'ui/fieldset'
import { NumberInput } from 'ui/number-input'

export default function Validation() {
	return (
		<>
			<Field severity="error">
				<Label>Guests</Label>
				<NumberInput min={1} max={12} defaultValue={14} />
				<Message>Enter a number from 1 to 12.</Message>
			</Field>
			<Field severity="success">
				<Label>Guests</Label>
				<NumberInput min={1} max={12} defaultValue={4} />
				<Message severity="success">Tables for up to 6 are free at 7:30 PM.</Message>
			</Field>
			<Field severity="warning">
				<Label>Guests</Label>
				<NumberInput min={1} max={12} defaultValue={10} />
				<Message severity="warning">Groups of more than 8 pay a deposit.</Message>
			</Field>
		</>
	)
}

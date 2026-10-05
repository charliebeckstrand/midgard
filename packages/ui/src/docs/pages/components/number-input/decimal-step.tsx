import { Description, Field, Label } from 'ui/fieldset'
import { NumberInput } from 'ui/number-input'

export default function DecimalStep() {
	return (
		<Field>
			<Label>Weight (kg)</Label>
			<Description>The value rounds to one decimal place when you leave the field.</Description>
			<NumberInput step={0.1} min={0} defaultValue={72.5} />
		</Field>
	)
}

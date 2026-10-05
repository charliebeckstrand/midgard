import { DateInput } from 'ui/date-input'
import { Field, Label } from 'ui/fieldset'

export default function Disabled() {
	return (
		<Field>
			<Label>Ship date</Label>
			<DateInput format="MM/DD/YYYY" disabled defaultValue={new Date(2026, 5, 15)} />
		</Field>
	)
}

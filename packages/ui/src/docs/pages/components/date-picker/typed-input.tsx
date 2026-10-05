import { DatePicker } from 'ui/date-picker'
import { Field, Label } from 'ui/fieldset'

export default function TypedInput() {
	return (
		<Field>
			<Label>Due date</Label>
			<DatePicker input format="MM/DD/YYYY" defaultValue={new Date(2026, 5, 15)} />
		</Field>
	)
}

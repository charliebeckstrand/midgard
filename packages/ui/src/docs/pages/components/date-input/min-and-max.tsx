import { DateInput } from 'ui/date-input'
import { Description, Field, Label } from 'ui/fieldset'

export default function MinAndMax() {
	return (
		<Field>
			<Label>Delivery date</Label>
			<Description>Deliveries run from June 1 to August 31, 2026.</Description>
			<DateInput format="MM/DD/YYYY" min={new Date(2026, 5, 1)} max={new Date(2026, 7, 31)} />
		</Field>
	)
}

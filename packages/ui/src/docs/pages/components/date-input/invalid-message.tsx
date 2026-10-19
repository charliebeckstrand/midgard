import { DateInput } from 'ui/date-input'
import { Description, Field, Label } from 'ui/fieldset'

export default function InvalidMessage() {
	return (
		<Field>
			<Label>Pickup date</Label>
			<Description>Type a date that does not exist, such as February 30.</Description>
			<DateInput format="MM/DD/YYYY" invalidMessage="Enter a real date." />
		</Field>
	)
}

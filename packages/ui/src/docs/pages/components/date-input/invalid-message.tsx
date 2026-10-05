import { DateInput } from 'ui/date-input'
import { Description, Field, Label } from 'ui/fieldset'

export default function InvalidMessage() {
	return (
		<Field>
			<Label>Due date</Label>
			<Description>Type a day that does not exist, such as 02/30/2026.</Description>
			<DateInput format="MM/DD/YYYY" invalidMessage="Enter a real date, such as 06/15/2026." />
		</Field>
	)
}

import { Description, Label } from 'ui/fieldset'
import { Radio, RadioField, RadioGroup } from 'ui/radio'

export default function DisabledOption() {
	return (
		<RadioGroup aria-label="Payment method">
			<RadioField>
				<Radio name="payment" value="card" defaultChecked />
				<Label>Card</Label>
			</RadioField>
			<RadioField>
				<Radio name="payment" value="bank-transfer" />
				<Label>Bank transfer</Label>
			</RadioField>
			<RadioField>
				<Radio name="payment" value="invoice" disabled />
				<Label>Invoice</Label>
				<Description>Invoices are available on the Business plan.</Description>
			</RadioField>
		</RadioGroup>
	)
}

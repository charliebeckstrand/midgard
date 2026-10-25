import { Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'

const methods = [
	{ id: 'standard', label: 'Standard', available: true },
	{ id: 'express', label: 'Express', available: true },
	{ id: 'overnight', label: 'Overnight', available: false },
]

export default function DisabledOption() {
	return (
		<Field>
			<Label>Shipping method</Label>
			<Select
				defaultValue="standard"
				displayValue={(id) => methods.find((method) => method.id === id)?.label ?? id}
			>
				{methods.map((method) => (
					<SelectOption key={method.id} value={method.id} disabled={!method.available}>
						<SelectLabel>{method.label}</SelectLabel>
					</SelectOption>
				))}
			</Select>
		</Field>
	)
}

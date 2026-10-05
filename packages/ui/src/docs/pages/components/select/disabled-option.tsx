import { Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'

const methods = [
	{ id: 'standard', name: 'Standard', available: true },
	{ id: 'express', name: 'Express', available: true },
	{ id: 'overnight', name: 'Overnight', available: false },
]

export default function DisabledOption() {
	return (
		<Field>
			<Label>Shipping method</Label>
			<Select
				defaultValue="standard"
				displayValue={(id) => methods.find((method) => method.id === id)?.name ?? id}
			>
				{methods.map((method) => (
					<SelectOption key={method.id} value={method.id} disabled={!method.available}>
						<SelectLabel>{method.name}</SelectLabel>
					</SelectOption>
				))}
			</Select>
		</Field>
	)
}

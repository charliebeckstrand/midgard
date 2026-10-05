import { Field, Fieldset, Label, Legend } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function Disabled() {
	return (
		<Fieldset disabled>
			<Legend>Billing address</Legend>
			<Stack gap="lg">
				<Field>
					<Label>Street</Label>
					<Input defaultValue="123 Main St" />
				</Field>
				<Field>
					<Label>City</Label>
					<Input defaultValue="Springfield" />
				</Field>
			</Stack>
		</Fieldset>
	)
}

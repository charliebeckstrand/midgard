import { Control } from 'ui/control'
import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function NestedFields() {
	return (
		<Control readOnly>
			<Stack gap="lg">
				<Field>
					<Label>Account ID</Label>
					<Input defaultValue="acct_4821" />
				</Field>
				<Field>
					<Label>Owner</Label>
					<Input type="email" defaultValue="jane@example.com" />
				</Field>
			</Stack>
		</Control>
	)
}

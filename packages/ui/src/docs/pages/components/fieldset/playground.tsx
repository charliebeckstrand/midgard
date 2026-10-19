import { Description, Field, Fieldset, type FieldsetProps, Label, Legend } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'
import { Textarea } from 'ui/textarea'

export default function FieldsetPlayground(props: FieldsetProps) {
	return (
		<Fieldset {...props}>
			<Legend>Profile</Legend>
			<Stack gap="lg">
				<Field autoComplete="name">
					<Label>Full name</Label>
					<Input placeholder="Wade Cooper" />
				</Field>
				<Field autoComplete="email">
					<Label>Email</Label>
					<Description>Account notices go to this address.</Description>
					<Input type="email" placeholder="wade@example.com" />
				</Field>
				<Field>
					<Label>Bio</Label>
					<Textarea placeholder="Tell your team about yourself" rows={3} />
				</Field>
			</Stack>
		</Fieldset>
	)
}

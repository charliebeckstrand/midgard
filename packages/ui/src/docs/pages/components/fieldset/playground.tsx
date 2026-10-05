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
					<Input placeholder="Jane Smith" />
				</Field>
				<Field autoComplete="email">
					<Label>Email</Label>
					<Description>We send account notices to this address.</Description>
					<Input type="email" placeholder="jane@example.com" />
				</Field>
				<Field>
					<Label>Bio</Label>
					<Textarea placeholder="Tell us about yourself" rows={3} />
				</Field>
			</Stack>
		</Fieldset>
	)
}

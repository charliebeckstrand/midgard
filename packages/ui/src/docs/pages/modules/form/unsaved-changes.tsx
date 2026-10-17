import { Badge } from 'ui/badge'
import { Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form, FormReset, FormSubmit, useFormStatus } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'
import { Textarea } from 'ui/textarea'

function Actions() {
	const status = useFormStatus()

	return (
		<Flex gap="sm" align="center">
			<FormSubmit disabled={!status?.dirty || !status.valid}>Save</FormSubmit>
			<FormReset variant="plain">Discard</FormReset>
			{status?.dirty && <Badge color="amber">Unsaved changes</Badge>}
		</Flex>
	)
}

export default function UnsavedChanges() {
	return (
		<Form
			defaultValues={{ username: 'jane', bio: 'Product designer in Lisbon.' }}
			validate={{
				username: (value) => (value.length < 3 ? 'Use at least 3 characters.' : undefined),
			}}
			onSubmit={async (values, { reset }) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				reset(values)
			}}
		>
			<Stack gap="lg">
				<Field autoComplete="username">
					<Label>Username</Label>
					<Input name="username" />
					<Message name="username" />
				</Field>
				<Field>
					<Label>Bio</Label>
					<Textarea name="bio" rows={3} />
				</Field>
				<Actions />
			</Stack>
		</Form>
	)
}

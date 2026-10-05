import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

const taken = ['admin', 'jane']

export default function ServerErrors() {
	return (
		<Form
			defaultValues={{ username: 'jane' }}
			validate={{ username: (value) => (value ? undefined : 'Enter a username.') }}
			onSubmit={async ({ username }) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				return taken.includes(username)
					? { fieldErrors: { username: 'This username is taken.' } }
					: undefined
			}}
		>
			<Stack gap="lg">
				<Field autoComplete="username">
					<Label>Username</Label>
					<Input name="username" />
					<Message name="username" />
				</Field>
				<Button type="submit">Register</Button>
			</Stack>
		</Form>
	)
}

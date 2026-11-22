import { Field, Label } from 'ui/fieldset'
import { Form, FormError, FormSubmit } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function FormErrorExample() {
	// The server refuses the pair of values, not one field, so the issue belongs
	// to the whole form. The next submit clears it.
	return (
		<Form
			defaultValues={{ email: 'wade@example.com', password: 'wrong' }}
			onSubmit={async ({ password }) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				return password === 'secret' ? undefined : { formError: 'Invalid email or password.' }
			}}
		>
			<Stack gap="lg">
				<FormError />
				<Field autoComplete="email">
					<Label>Email</Label>
					<Input name="email" type="email" />
				</Field>
				<Field autoComplete="current-password">
					<Label>Password</Label>
					<Input name="password" type="password" />
				</Field>
				<FormSubmit>Sign in</FormSubmit>
			</Stack>
		</Form>
	)
}

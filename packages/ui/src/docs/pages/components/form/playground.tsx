import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormProps } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

type Invite = { name: string; email: string }

export default function FormPlayground(props: FormProps<Invite>) {
	return (
		<Form
			{...props}
			defaultValues={{ name: '', email: '' }}
			validate={{
				name: (value) => (value.trim() ? undefined : 'Enter a name.'),
				email: (value) => (value.includes('@') ? undefined : 'Enter a valid email address.'),
			}}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Field>
					<Label>Name</Label>
					<Input name="name" placeholder="Jane Smith" />
					<Message name="name" />
				</Field>
				<Field>
					<Label>Email</Label>
					<Input name="email" type="email" placeholder="jane@example.com" />
					<Message name="email" />
				</Field>
				<Button type="submit">Send invite</Button>
			</Stack>
		</Form>
	)
}

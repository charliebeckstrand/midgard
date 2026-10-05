import { Button } from 'ui/button'
import { Control } from 'ui/control'
import { Label, Message } from 'ui/fieldset'
import { Form } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function Required() {
	return (
		<Form
			defaultValues={{ name: '' }}
			validate={{ name: (value) => (value.trim() ? undefined : 'Enter your full name.') }}
			onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1000))}
		>
			<Stack gap="lg">
				<Control required>
					<Label>Full name</Label>
					<Input name="name" placeholder="Jane Smith" />
					<Message name="name" />
				</Control>
				<Button type="submit">Submit</Button>
			</Stack>
		</Form>
	)
}

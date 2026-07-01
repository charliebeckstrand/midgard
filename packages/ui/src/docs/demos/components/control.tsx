import { useState } from 'react'
import { Alert, AlertDescription } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Control } from '../../../components/control'
import { Label, Message } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Input } from '../../../components/input'
import { Stack } from '../../../components/stack'
import { Example } from '../../engine'

function RequiredExample() {
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = () => {
		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	return (
		<Form defaultValues={{ name: '' }} disabled={submitting} onSubmit={handleSubmit}>
			<Stack gap="md">
				<Control required>
					<Label>Full name</Label>
					<Input placeholder="Jane Smith" />
				</Control>
				<Button type="submit">Submit</Button>
			</Stack>
		</Form>
	)
}

export function Demo() {
	return (
		<>
			<Alert severity="info" variant="soft" closable>
				<AlertDescription>
					Control generates and propagates a stable ID and state to control-aware children.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Control>
					<Label>Email</Label>
					<Input type="email" placeholder="jane@example.com" />
				</Control>
			</Example>

			<Example title="Invalid">
				<Control invalid>
					<Label>Email</Label>
					<Input type="email" />
					<Message>Please enter a valid email.</Message>
				</Control>
			</Example>

			<Example title="Required">
				<RequiredExample />
			</Example>

			<Example title="Disabled">
				<Control disabled>
					<Label>Email</Label>
					<Input placeholder="jane@example.com" />
				</Control>
			</Example>

			<Example title="Read-only">
				<Control readOnly>
					<Label>Account ID</Label>
					<Input value="acct_1234567890" />
				</Control>
			</Example>
		</>
	)
}

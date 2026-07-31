import { useState } from 'react'
import { Alert, AlertDescription } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Control } from '../../../components/control'
import { Label, Message } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Input } from '../../../components/input'
import { Stack } from '../../../components/stack'
import { Example } from '../../engine'

const severities = [
	{ severity: 'success', message: 'Looks good!' },
	{ severity: 'warning', message: 'Be careful!' },
	{ severity: 'error', message: 'Something went wrong.' },
] as const

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
					Control propagates a stable ID and state to control-aware children.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Control>
					<Label>Email</Label>
					<Input type="email" placeholder="jane@example.com" />
				</Control>
			</Example>

			<Example title="Severity">
				{severities.map(({ severity, message }) => (
					<Control key={severity} severity={severity}>
						<Label>Email</Label>
						<Input type="email" />
						<Message severity={severity}>{message}</Message>
					</Control>
				))}
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

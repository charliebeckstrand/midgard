import { useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Form, type SubmitOutcome } from 'ui/form'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'
import { Switch, SwitchField } from 'ui/switch'

type Subscription = { email: string }

export default function SuccessAndFailure() {
	const [fail, setFail] = useState(false)

	const [outcome, setOutcome] = useState<SubmitOutcome<Subscription>>()

	return (
		<Stack gap="lg">
			<SwitchField>
				<Switch checked={fail} onChange={(event) => setFail(event.target.checked)} />
				<Label>Simulate a server error</Label>
			</SwitchField>
			<Form
				defaultValues={{ email: 'jane@example.com' }}
				onSubmit={async () => {
					await new Promise((resolve) => setTimeout(resolve, 1000))

					if (fail) throw new Error('The server is busy. Try again in a minute.')
				}}
				onSettled={setOutcome}
			>
				<Stack gap="lg">
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" />
					</Field>
					<Button type="submit">Subscribe</Button>
				</Stack>
			</Form>
			{outcome && (
				<Alert
					severity={outcome.ok ? 'success' : 'error'}
					description={
						outcome.ok ? `${outcome.values.email} is on the list.` : outcome.error.message
					}
				/>
			)}
		</Stack>
	)
}

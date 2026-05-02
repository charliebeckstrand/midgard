'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '../../components/alert'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { ErrorMessage, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'
export const meta = { category: 'Forms' }

export default function ControlDemo() {
	const [disabled, setDisabled] = useState(false)

	return (
		<Stack gap="xl">
			<Alert type="info" variant="soft" color="blue" closable>
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
					<ErrorMessage>Please enter a valid email.</ErrorMessage>
				</Control>
			</Example>

			<Example title="Required">
				<form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
					<Control required>
						<Label>Full name</Label>
						<Input placeholder="Jane Smith" />
					</Control>
					<div>
						<Button type="submit">Submit</Button>
					</div>
				</form>
			</Example>

			<Example title="Disabled">
				<Control disabled>
					<Label>Email</Label>
					<Input placeholder="jane@example.com" />
				</Control>
			</Example>

			<Example title="Disabled fieldset">
				<Fieldset>
					<Legend>Profile</Legend>
					<Stack gap="lg">
						<Control disabled={disabled}>
							<Label>Name</Label>
							<Input placeholder="Jane Smith" />
						</Control>
						<Control disabled={disabled}>
							<Label>Email</Label>
							<Input type="email" placeholder="jane@example.com" />
						</Control>
						<Control disabled={disabled}>
							<Label>Bio</Label>
							<Textarea placeholder="Tell us about yourself" />
						</Control>
						<div>
							<Button
								variant="soft"
								color={disabled ? 'green' : 'red'}
								onClick={() => setDisabled((d) => !d)}
							>
								{disabled ? 'Enable' : 'Disable'} fields
							</Button>
						</div>
					</Stack>
				</Fieldset>
			</Example>

			<Example title="Read-only">
				<Control readOnly>
					<Label>Account ID</Label>
					<Input value="acct_1234567890" />
				</Control>
			</Example>
		</Stack>
	)
}

'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '../../components/alert'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { ErrorMessage, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'
export const meta = { category: 'Forms' }

export default function ControlDemo() {
	const [disabled, setDisabled] = useState(false)

	return (
		<Stack gap={8}>
			<Alert type="info" variant="soft" color="blue" closable>
				<AlertDescription>
					Control generates a stable id and propagates state (disabled, readOnly, size, variant) to
					control-aware children (Label, Input, Textarea, Description, ErrorMessage).
				</AlertDescription>

				<AlertDescription>
					Parent state cascades to nested children — matching fieldset disabled semantics — while
					size and variant inherit from the nearest ancestor unless explicitly overridden.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Sizer>
					<Control>
						<Label>Email</Label>
						<Input type="email" placeholder="jane@example.com" />
					</Control>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Control invalid>
						<Label>Email</Label>
						<Input type="email" />
						<ErrorMessage>Please enter a valid email.</ErrorMessage>
					</Control>
				</Sizer>
			</Example>

			<Example title="Required">
				<Sizer>
					<form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
						<Control required>
							<Label>Full name</Label>
							<Input placeholder="Jane Smith" />
						</Control>
						<div>
							<Button type="submit">Submit</Button>
						</div>
					</form>
				</Sizer>
			</Example>

			<Example title="Disabled">
				<Sizer>
					<Control disabled>
						<Label>Email</Label>
						<Input placeholder="jane@example.com" />
					</Control>
				</Sizer>
			</Example>

			<Example title="Disabled fieldset">
				<Sizer size="lg">
					<Fieldset>
						<Legend>Profile</Legend>
						<Stack gap={4}>
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
				</Sizer>
			</Example>

			<Example title="Read-only">
				<Sizer>
					<Control readOnly>
						<Label>Account ID</Label>
						<Input value="acct_1234567890" />
					</Control>
				</Sizer>
			</Example>
		</Stack>
	)
}

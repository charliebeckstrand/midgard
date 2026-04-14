'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { ErrorMessage, Fieldset, Label, Legend } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function ControlDemo() {
	const [disabled, setDisabled] = useState(false)

	return (
		<Stack gap={8}>
			<Example
				title="Auto-wired field"
				code={code`
					import { Control } from 'ui/control'
					import { Label, Description } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Control>
					  <Label>Email</Label>
					  <Input type="email" placeholder="jane@example.com" />
					</Control>
				`}
			>
				<Sizer>
					<Control>
						<Label>Email</Label>
						<Input type="email" placeholder="jane@example.com" />
					</Control>
				</Sizer>
			</Example>

			<Example
				title="Invalid"
				code={code`
					import { Control } from 'ui/control'
					import { Label, ErrorMessage } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Control invalid>
					  <Label>Email</Label>
					  <Input type="email" />
					  <ErrorMessage>Please enter a valid email.</ErrorMessage>
					</Control>
				`}
			>
				<Sizer>
					<Control invalid>
						<Label>Email</Label>
						<Input type="email" />
						<ErrorMessage>Please enter a valid email.</ErrorMessage>
					</Control>
				</Sizer>
			</Example>

			<Example
				title="Required"
				code={code`
					import { Button } from 'ui/button'
					import { Control } from 'ui/control'
					import { Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<form onSubmit={(e) => e.preventDefault()}>
					  <Control required>
					    <Label>Full name</Label>
					    <Input placeholder="Jane Smith" />
					  </Control>
					  <Button type="submit">Submit</Button>
					</form>
				`}
			>
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

			<Example
				title="Disabled"
				code={code`
					import { Control } from 'ui/control'
					import { Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Control disabled>
					  <Label>Email</Label>
					  <Input placeholder="jane@example.com" />
					</Control>
				`}
			>
				<Sizer>
					<Control disabled>
						<Label>Email</Label>
						<Input placeholder="jane@example.com" />
					</Control>
				</Sizer>
			</Example>

			<Example
				title="Disabled fieldset"
				code={code`
					import { Control } from 'ui/control'
					import { Fieldset, Label, Legend } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Fieldset>
					  <Legend>Profile</Legend>
					  <Button onClick={() => setDisabled((d) => !d)}>
					    Toggle disabled
					  </Button>
					  <Control disabled={disabled}>
					    <Label>Name</Label>
					    <Input placeholder="Jane Smith" />
					  </Control>
					  <Control disabled={disabled}>
					    <Label>Email</Label>
					    <Input type="email" placeholder="jane@example.com" />
					  </Control>
					</Fieldset>
				`}
			>
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

			<Example
				title="Read-only"
				code={code`
					import { Control } from 'ui/control'
					import { Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Control readOnly>
					  <Label>Account ID</Label>
					  <Input value="acct_1234567890" />
					</Control>
				`}
			>
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

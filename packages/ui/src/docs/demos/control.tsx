'use client'

import { useState } from 'react'
import { Control } from '../../components/control'
import { Description, ErrorMessage, Fieldset, Label, Legend } from '../../components/fieldset'
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
					  <Description>We'll use this for account notifications.</Description>
					  <Input type="email" placeholder="jane@example.com" />
					</Control>
				`}
			>
				<Sizer>
					<Control>
						<Label>Email</Label>
						<Description>We'll use this for account notifications.</Description>
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
					import { Control } from 'ui/control'
					import { Label } from 'ui/fieldset'
					import { Input } from 'ui/input'

					<Control required>
					  <Label>Full name</Label>
					  <Input placeholder="Jane Smith" />
					</Control>
				`}
			>
				<Sizer>
					<Control required>
						<Label>Full name</Label>
						<Input placeholder="Jane Smith" />
					</Control>
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
					  <button onClick={() => setDisabled((d) => !d)}>
					    Toggle disabled
					  </button>
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
							<button
								type="button"
								onClick={() => setDisabled((d) => !d)}
								className="self-start text-sm underline text-blue-600"
							>
								{disabled ? 'Enable' : 'Disable'} fields
							</button>
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

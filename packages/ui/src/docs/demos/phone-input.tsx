'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { PhoneInput } from '../../components/phone-input'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Field>
				<Label>Phone</Label>
				<PhoneInput value={value} onChange={setValue} placeholder="(555) 555-5555" />
			</Field>
		</Example>
	)
}

export default function PhoneInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default (US)">
				<Field>
					<Label>Phone</Label>
					<PhoneInput placeholder="(555) 555-5555" />
				</Field>
			</Example>

			<Example title="International">
				<Field>
					<Label>Phone</Label>
					<PhoneInput country="international" placeholder="+14155551234" />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<PhoneInput size="sm" placeholder="(555) 555-5555" />
				</Field>
				<Field>
					<Label>Medium</Label>
					<PhoneInput size="md" placeholder="(555) 555-5555" />
				</Field>
				<Field>
					<Label>Large</Label>
					<PhoneInput size="lg" placeholder="(555) 555-5555" />
				</Field>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<PhoneInput disabled defaultValue="5555551234" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<PhoneInput data-invalid placeholder="(555) 555-5555" />
				</Field>
			</Example>
		</Stack>
	)
}

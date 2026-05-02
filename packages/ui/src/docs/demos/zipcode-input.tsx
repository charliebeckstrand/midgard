'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { ZipcodeInput } from '../../components/zipcode-input'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Field>
				<Label>ZIP</Label>
				<ZipcodeInput value={value} onChange={setValue} />
			</Field>
		</Example>
	)
}

export default function ZipcodeInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="US">
				<Field>
					<Label>ZIP</Label>
					<ZipcodeInput country="US" />
				</Field>
			</Example>

			<Example title="Canada">
				<Field>
					<Label>Postal code</Label>
					<ZipcodeInput country="CA" />
				</Field>
			</Example>

			<Example title="United Kingdom">
				<Field>
					<Label>Postcode</Label>
					<ZipcodeInput country="GB" />
				</Field>
			</Example>

			<Example title="International">
				<Field>
					<Label>Postal code</Label>
					<ZipcodeInput country="international" placeholder="Postal code" />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<ZipcodeInput size="sm" />
				</Field>
				<Field>
					<Label>Medium</Label>
					<ZipcodeInput size="md" />
				</Field>
				<Field>
					<Label>Large</Label>
					<ZipcodeInput size="lg" />
				</Field>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<ZipcodeInput disabled defaultValue="94103" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<ZipcodeInput data-invalid />
				</Field>
			</Example>
		</Stack>
	)
}

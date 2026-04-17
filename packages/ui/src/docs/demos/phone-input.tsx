'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { PhoneInput } from '../../components/phone-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Sizer>
				<Field>
					<Label>Phone</Label>
					<PhoneInput value={value} onChange={setValue} placeholder="(555) 555-5555" />
				</Field>
			</Sizer>
		</Example>
	)
}

export default function PhoneInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default (US)">
				<Sizer>
					<Field>
						<Label>Phone</Label>
						<PhoneInput placeholder="(555) 555-5555" />
					</Field>
				</Sizer>
			</Example>

			<Example title="International">
				<Sizer>
					<Field>
						<Label>Phone</Label>
						<PhoneInput country="international" placeholder="+14155551234" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<PhoneInput size="sm" placeholder="(555) 555-5555" />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<PhoneInput size="md" placeholder="(555) 555-5555" />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<PhoneInput size="lg" placeholder="(555) 555-5555" />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<PhoneInput disabled defaultValue="5555551234" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<PhoneInput data-invalid placeholder="(555) 555-5555" />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}

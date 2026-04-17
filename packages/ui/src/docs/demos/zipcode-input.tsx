'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { ZipcodeInput } from '../../components/zipcode-input'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Sizer>
				<Field>
					<Label>ZIP</Label>
					<ZipcodeInput value={value} onChange={setValue} />
				</Field>
			</Sizer>
		</Example>
	)
}

export default function ZipcodeInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="US">
				<Sizer>
					<Field>
						<Label>ZIP</Label>
						<ZipcodeInput country="US" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Canada">
				<Sizer>
					<Field>
						<Label>Postal code</Label>
						<ZipcodeInput country="CA" />
					</Field>
				</Sizer>
			</Example>

			<Example title="United Kingdom">
				<Sizer>
					<Field>
						<Label>Postcode</Label>
						<ZipcodeInput country="GB" />
					</Field>
				</Sizer>
			</Example>

			<Example title="International">
				<Sizer>
					<Field>
						<Label>Postal code</Label>
						<ZipcodeInput country="international" placeholder="Postal code" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<ZipcodeInput size="sm" />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<ZipcodeInput size="md" />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<ZipcodeInput size="lg" />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<ZipcodeInput disabled defaultValue="94103" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<ZipcodeInput data-invalid />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}

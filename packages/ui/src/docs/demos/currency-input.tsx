'use client'

import { useState } from 'react'
import { CurrencyInput } from '../../components/currency-input'
import { Field, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function Controlled() {
	const [value, setValue] = useState<number | undefined>(1234.56)

	return (
		<Example title="Controlled">
			<Field>
				<Label>Freight rate</Label>
				<CurrencyInput value={value} onChange={setValue} />
			</Field>
		</Example>
	)
}

export default function CurrencyInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="USD">
				<Field>
					<Label>Amount</Label>
					<CurrencyInput defaultValue={1234.56} />
				</Field>
			</Example>

			<Example title="Currency and locale">
				<Field>
					<Label>Invoice total</Label>
					<CurrencyInput currency="EUR" locale="en-IE" defaultValue={2499} />
				</Field>
			</Example>

			<Example title="No fraction digits">
				<Field>
					<Label>Accessorial fee</Label>
					<CurrencyInput currency="JPY" locale="ja-JP" defaultValue={9800} />
				</Field>
			</Example>

			<Example title="Custom precision">
				<Field>
					<Label>Per-mile rate</Label>
					<CurrencyInput precision={4} defaultValue={2.4567} />
				</Field>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<CurrencyInput disabled defaultValue={500} />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<CurrencyInput data-invalid defaultValue={500} />
				</Field>
			</Example>
		</Stack>
	)
}

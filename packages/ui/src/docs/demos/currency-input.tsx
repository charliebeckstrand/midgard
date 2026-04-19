'use client'

import { useState } from 'react'
import { CurrencyInput } from '../../components/currency-input'
import { Field, Label } from '../../components/fieldset'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

function Controlled() {
	const [value, setValue] = useState<number | undefined>(1234.56)

	return (
		<Example title="Controlled">
			<Sizer>
				<Field>
					<Label>Freight rate</Label>
					<CurrencyInput value={value} onChange={setValue} />
				</Field>
			</Sizer>
		</Example>
	)
}

export default function CurrencyInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="USD">
				<Sizer>
					<Field>
						<Label>Amount</Label>
						<CurrencyInput defaultValue={1234.56} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Currency and locale">
				<Sizer>
					<Field>
						<Label>Invoice total</Label>
						<CurrencyInput currency="EUR" locale="en-IE" defaultValue={2499} />
					</Field>
				</Sizer>
			</Example>

			<Example title="No fraction digits">
				<Sizer>
					<Field>
						<Label>Accessorial fee</Label>
						<CurrencyInput currency="JPY" locale="ja-JP" defaultValue={9800} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Custom precision">
				<Sizer>
					<Field>
						<Label>Per-mile rate</Label>
						<CurrencyInput precision={4} defaultValue={2.4567} />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<CurrencyInput disabled defaultValue={500} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<CurrencyInput data-invalid defaultValue={500} />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}

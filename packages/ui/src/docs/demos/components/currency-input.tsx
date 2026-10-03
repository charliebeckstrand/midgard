import { useState } from 'react'
import { CurrencyInput } from '../../../components/currency-input'
import { Field, Label } from '../../../components/fieldset'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

function ControlledExample() {
	const [value, setValue] = useState<number | null>(1234.56)

	return (
		<Example title="Controlled">
			<Field>
				<Label>Freight rate</Label>
				<CurrencyInput value={value} onValueChange={setValue} />
			</Field>
			<Text className="tabular-nums">{value ?? 'Empty'}</Text>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="CurrencyInput"
				captions={false}
				render={(props, label) => (
					<CurrencyInput {...props} aria-label={label} placeholder={label} />
				)}
			/>

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

			<ControlledExample />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<CurrencyInput disabled defaultValue={500} />
				</Field>
			</Example>
		</>
	)
}

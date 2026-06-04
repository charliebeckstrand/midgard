import { useState } from 'react'
import { Button } from '../../../components/button'
import { CurrencyInput } from '../../../components/currency-input'
import { Field, Label } from '../../../components/fieldset'
import { Flex } from '../../../components/flex'
import { LocaleProvider } from '../../../providers/locale'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

const PRESETS = [
	{ label: 'US', locale: 'en-US', currency: 'USD' },
	{ label: 'Germany', locale: 'de-DE', currency: 'EUR' },
	{ label: 'Japan', locale: 'ja-JP', currency: 'JPY' },
	{ label: 'India', locale: 'en-IN', currency: 'INR' },
] as const

const USAGE = `import { LocaleProvider } from 'ui/providers/locale'

// Broadcast locale + currency once at the app root. Locale-aware fields
// (currency, number, date, phone) inherit them; explicit props still win.
<LocaleProvider locale="de-DE" currency="EUR">
	<CurrencyInput defaultValue={1234.56} />
</LocaleProvider>`

export function Demo() {
	const [index, setIndex] = useState(0)

	const [amount, setAmount] = useState<number | undefined>(1234.56)

	const preset = PRESETS[index]

	if (!preset) return null

	return (
		<Example
			code={USAGE}
			actions={
				<Flex gap="sm" wrap>
					{PRESETS.map((option, i) => (
						<Button
							key={option.locale}
							color="blue"
							variant={i === index ? undefined : 'soft'}
							onClick={() => setIndex(i)}
						>
							{option.label}
						</Button>
					))}
				</Flex>
			}
		>
			<LocaleProvider locale={preset.locale} currency={preset.currency}>
				<Field>
					<Label>Invoice total</Label>
					<CurrencyInput value={amount} onValueChange={setAmount} />
				</Field>
			</LocaleProvider>
		</Example>
	)
}

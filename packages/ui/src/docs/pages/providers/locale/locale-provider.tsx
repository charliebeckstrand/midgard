import { useState } from 'react'
import { Button } from 'ui/button'
import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'
import { Group } from 'ui/group'
import { LocaleProvider } from 'ui/providers/locale'

const presets = [
	{ locale: 'en-US', currency: 'USD' },
	{ locale: 'en-GB', currency: 'GBP' },
	{ locale: 'ja-JP', currency: 'JPY' },
	{ locale: 'en-IN', currency: 'INR' },
] as const

export default function LocaleProviderPresets() {
	const [preset, setPreset] = useState<(typeof presets)[number]>(presets[0])

	const [amount, setAmount] = useState<number | null>(1234.56)

	return (
		<>
			<Group>
				{presets.map((option) => (
					<Button
						key={option.locale}
						variant={option === preset ? undefined : 'soft'}
						aria-pressed={option === preset}
						onClick={() => setPreset(option)}
					>
						{option.locale}
					</Button>
				))}
			</Group>
			<LocaleProvider locale={preset.locale} currency={preset.currency}>
				<Field>
					<Label>Invoice total</Label>
					<CurrencyInput value={amount} onValueChange={setAmount} />
				</Field>
			</LocaleProvider>
		</>
	)
}

import { useState } from 'react'
import { CurrencyInput } from 'ui/currency-input'
import { Field, Label } from 'ui/fieldset'
import { LocaleProvider } from 'ui/providers/locale'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'

const presets = [
	{ locale: 'en-US', currency: 'USD' },
	{ locale: 'en-GB', currency: 'GBP' },
	{ locale: 'ja-JP', currency: 'JPY' },
	{ locale: 'en-IN', currency: 'INR' },
] as const

type Preset = (typeof presets)[number]

export default function SwitchLocales() {
	const [preset, setPreset] = useState<Preset>(presets[0])

	const [amount, setAmount] = useState<number | null>(1234.56)

	return (
		<>
			<Segment
				value={preset.locale}
				onValueChange={(locale) =>
					setPreset((current) => presets.find((option) => option.locale === locale) ?? current)
				}
			>
				<SegmentControl aria-label="Locale">
					{presets.map((option) => (
						<SegmentItem key={option.locale} value={option.locale}>
							{option.locale}
						</SegmentItem>
					))}
				</SegmentControl>
			</Segment>
			<LocaleProvider locale={preset.locale} currency={preset.currency}>
				<Field>
					<Label>Invoice total</Label>
					<CurrencyInput value={amount} onValueChange={setAmount} />
				</Field>
			</LocaleProvider>
		</>
	)
}

import { Example } from 'docs'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { CurrencyInput } from '../../../components/currency-input'
import { Field, Label } from '../../../components/fieldset'
import { Flex } from '../../../components/flex'
import { Group } from '../../../components/group'
import { LocaleProvider } from '../../../providers/locale'

export const meta = { name: 'Locale Provider' }

const PRESETS = [
	{ label: 'US', locale: 'en-US', currency: 'USD' },
	{ label: 'UK', locale: 'en-GB', currency: 'GBP' },
	{ label: 'Japan', locale: 'ja-JP', currency: 'JPY' },
	{ label: 'India', locale: 'en-IN', currency: 'INR' },
] as const

function LocalProviderExample({ preset }: { preset: (typeof PRESETS)[number] }) {
	const [amount, setAmount] = useState<number | undefined>(1234.56)

	return (
		<LocaleProvider locale={preset.locale} currency={preset.currency}>
			<Field>
				<Label>Invoice total</Label>
				<CurrencyInput value={amount} onValueChange={setAmount} />
			</Field>
		</LocaleProvider>
	)
}

export function Demo() {
	const [index, setIndex] = useState(0)

	const preset = PRESETS[index]

	if (!preset) return null

	return (
		<Example
			title="LocaleProvider"
			actions={
				<Flex gap="sm" wrap>
					<Group>
						{PRESETS.map((option, i) => (
							<Button
								key={option.locale}
								variant={i === index ? undefined : 'soft'}
								onClick={() => setIndex(i)}
							>
								{option.label}
							</Button>
						))}
					</Group>
				</Flex>
			}
		>
			<LocalProviderExample preset={preset} />
		</Example>
	)
}

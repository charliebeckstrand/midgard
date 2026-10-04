import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { MaskInput, phoneMask, zipcodeMask } from '../../../components/mask-input'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export const handle = { category: 'input' }

function formatLicensePlate(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 7)

	if (clean.length <= 3) return clean

	return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

function formatSsn(raw: string) {
	const d = raw.replace(/\D/g, '').slice(0, 9)

	if (d.length <= 3) return d

	if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`

	return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

function formatIban(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 34)

	return clean.match(/.{1,4}/g)?.join(' ') ?? ''
}

function ControlledExample() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Field>
				<Label>License plate</Label>
				<MaskInput
					value={value}
					onValueChange={setValue}
					mask={formatLicensePlate}
					placeholder="ABC-1234"
				/>
			</Field>
			<Text className="tabular-nums">{value || 'Empty'}</Text>
		</Example>
	)
}

export default function Demo() {
	return (
		<>
			<Axes
				of="MaskInput"
				render={(props, label) => <MaskInput {...props} aria-label={label} mask={phoneMask()} />}
			/>

			<Example title="Phone">
				<Field>
					<Label>Phone</Label>
					<MaskInput mask={phoneMask()} placeholder="(555) 555-5555" />
				</Field>
				<Field>
					<Label>International phone</Label>
					<MaskInput mask={phoneMask('international')} placeholder="+14155551234" />
				</Field>
			</Example>

			<Example title="Postal code">
				<Field>
					<Label>ZIP</Label>
					<MaskInput mask={zipcodeMask()} />
				</Field>
				<Field>
					<Label>Canadian postal code</Label>
					<MaskInput mask={zipcodeMask('CA')} />
				</Field>
				<Field>
					<Label>UK postcode</Label>
					<MaskInput mask={zipcodeMask('GB')} />
				</Field>
			</Example>

			<Example title="License plate">
				<Field>
					<Label>License plate</Label>
					<MaskInput mask={formatLicensePlate} placeholder="ABC-1234" />
				</Field>
			</Example>

			<Example title="SSN">
				<Field>
					<Label>Social security number</Label>
					<MaskInput mask={formatSsn} inputMode="numeric" placeholder="123-45-6789" />
				</Field>
			</Example>

			<Example title="IBAN">
				<Field>
					<Label>IBAN</Label>
					<MaskInput mask={formatIban} placeholder="GB29 NWBK 6016 1331 9268 19" />
				</Field>
			</Example>

			<ControlledExample />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<MaskInput disabled mask={formatSsn} defaultValue="123456789" />
				</Field>
			</Example>
		</>
	)
}

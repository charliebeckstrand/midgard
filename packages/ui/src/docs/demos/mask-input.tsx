'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { MaskInput } from '../../components/mask-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

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

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Sizer>
				<Field>
					<Label>License plate</Label>
					<MaskInput value={value} onChange={setValue} format={formatLicensePlate} />
				</Field>
			</Sizer>
		</Example>
	)
}

export default function MaskInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="License plate">
				<Sizer>
					<Field>
						<Label>Plate</Label>
						<MaskInput format={formatLicensePlate} placeholder="ABC-1234" />
					</Field>
				</Sizer>
			</Example>

			<Example title="SSN">
				<Sizer>
					<Field>
						<Label>Social security number</Label>
						<MaskInput format={formatSsn} inputMode="numeric" placeholder="123-45-6789" />
					</Field>
				</Sizer>
			</Example>

			<Example title="IBAN">
				<Sizer>
					<Field>
						<Label>IBAN</Label>
						<MaskInput format={formatIban} placeholder="GB29 NWBK 6016 1331 9268 19" />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<MaskInput disabled format={formatSsn} defaultValue="123456789" />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}

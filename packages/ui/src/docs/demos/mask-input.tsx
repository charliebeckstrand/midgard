'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { MaskInput } from '../../components/mask-input'
import { Stack } from '../../components/stack'
import { code } from '../code'
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
		<Example
			title="Controlled"
			code={code`
			import { useState } from 'react'
			import { Field, Label } from 'ui/fieldset'
			import { MaskInput } from 'ui/mask-input'

			const [value, setValue] = useState('')
			
			function formatLicensePlate(raw: string) {
				const clean = raw
					.toUpperCase()
					.replace(/[^A-Z0-9]/g, '')
					.slice(0, 7)

				if (clean.length <= 3) return clean

				return \`\${clean.slice(0, 3)}-\${clean.slice(3)}\`
			}

			<Field>
				<Label>License plate</Label>
				<MaskInput 
					value={value} 
					onChange={setValue} 
					format={formatLicensePlate} 
					placeholder="ABC-1234" 
				/>
			</Field>
		`}
		>
			<Field>
				<Label>License plate</Label>
				<MaskInput
					value={value}
					onChange={setValue}
					format={formatLicensePlate}
					placeholder="ABC-1234"
				/>
			</Field>
		</Example>
	)
}

export default function MaskInputDemo() {
	return (
		<Stack gap="xl">
			<Example
				title="License plate"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { MaskInput } from 'ui/mask-input'

					function formatLicensePlate(raw: string) {
						const clean = raw
							.toUpperCase()
							.replace(/[^A-Z0-9]/g, '')
							.slice(0, 7)

						if (clean.length <= 3) return clean

						return \`\${clean.slice(0, 3)}-\${clean.slice(3)}\`
					}

					<Field>
						<Label>License plate</Label>
						<MaskInput format={formatLicensePlate} placeholder="ABC-1234" />
					</Field>
				`}
			>
				<Field>
					<Label>Plate</Label>
					<MaskInput format={formatLicensePlate} placeholder="ABC-1234" />
				</Field>
			</Example>

			<Example
				title="SSN"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { MaskInput } from 'ui/mask-input'

					function formatSsn(raw: string) {
						const d = raw.replace(/\\D/g, '').slice(0, 9)

						if (d.length <= 3) return d

						if (d.length <= 5) return \`\${d.slice(0, 3)}-\${d.slice(3)}\`

						return \`\${d.slice(0, 3)}-\${d.slice(3, 5)}-\${d.slice(5)}\`
					}

					<Field>
						<Label>Social security number</Label>
						<MaskInput format={formatSsn} inputMode="numeric" placeholder="123-45-6789" />
					</Field>
				`}
			>
				<Field>
					<Label>Social security number</Label>
					<MaskInput format={formatSsn} inputMode="numeric" placeholder="123-45-6789" />
				</Field>
			</Example>

			<Example
				title="IBAN"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { MaskInput } from 'ui/mask-input'

					function formatIban(raw: string) {
						const clean = raw
							.toUpperCase()
							.replace(/[^A-Z0-9]/g, '')
							.slice(0, 34)

						return clean.match(/.{1,4}/g)?.join(' ') ?? ''
					}

					<Field>
						<Label>IBAN</Label>
						<MaskInput format={formatIban} placeholder="GB29 NWBK 6016 1331 9268 19" />
					</Field>
				`}
			>
				<Field>
					<Label>IBAN</Label>
					<MaskInput format={formatIban} placeholder="GB29 NWBK 6016 1331 9268 19" />
				</Field>
			</Example>

			<Controlled />

			<Example
				title="Disabled"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { MaskInput } from 'ui/mask-input'

					const formatSsn = (raw: string) => {
						const d = raw.replace(/\\D/g, '').slice(0, 9)

						if (d.length <= 3) return d

						if (d.length <= 5) return \`\${d.slice(0, 3)}-\${d.slice(3)}\`

						return \`\${d.slice(0, 3)}-\${d.slice(3, 5)}-\${d.slice(5)}\`
					}

					<Field>
						<Label>Disabled</Label>
						<MaskInput disabled format={formatSsn} defaultValue="123456789" />
					</Field>
				`}
			>
				<Field>
					<Label>Disabled</Label>
					<MaskInput disabled format={formatSsn} defaultValue="123456789" />
				</Field>
			</Example>
		</Stack>
	)
}

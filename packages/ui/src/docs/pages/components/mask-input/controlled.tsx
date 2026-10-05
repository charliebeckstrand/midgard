import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { MaskInput } from 'ui/mask-input'
import { Text } from 'ui/text'

function formatLicensePlate(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 7)

	if (clean.length <= 3) return clean

	return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

export default function Controlled() {
	const [value, setValue] = useState('')

	return (
		<>
			<Field>
				<Label>License plate</Label>
				<MaskInput
					value={value}
					onValueChange={setValue}
					mask={formatLicensePlate}
					placeholder="ABC-1234"
				/>
			</Field>
			<Text>Value: {value || 'Empty'}</Text>
		</>
	)
}

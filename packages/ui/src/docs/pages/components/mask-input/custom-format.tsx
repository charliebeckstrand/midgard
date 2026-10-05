import { Field, Label } from 'ui/fieldset'
import { MaskInput } from 'ui/mask-input'

function formatIban(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 34)

	return clean.match(/.{1,4}/g)?.join(' ') ?? ''
}

export default function CustomFormat() {
	return (
		<Field>
			<Label>IBAN</Label>
			<MaskInput mask={formatIban} placeholder="GB29 NWBK 6016 1331 9268 19" />
		</Field>
	)
}

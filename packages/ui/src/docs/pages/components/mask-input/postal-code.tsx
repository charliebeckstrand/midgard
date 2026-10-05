import { Field, Label } from 'ui/fieldset'
import { MaskInput, zipcodeMask } from 'ui/mask-input'

export default function PostalCode() {
	return (
		<Field>
			<Label>Postal code</Label>
			<MaskInput mask={zipcodeMask('CA')} />
		</Field>
	)
}

import { Field, Label } from 'ui/fieldset'
import { MaskInput, phoneMask } from 'ui/mask-input'

export default function Disabled() {
	return (
		<Field>
			<Label>Phone</Label>
			<MaskInput mask={phoneMask()} defaultValue="4155550132" disabled />
		</Field>
	)
}

import { Field, Label } from 'ui/fieldset'
import { MaskInput, phoneMask } from 'ui/mask-input'

export default function InternationalPhone() {
	return (
		<Field>
			<Label>Phone</Label>
			<MaskInput mask={phoneMask('international')} placeholder="+442079460958" />
		</Field>
	)
}

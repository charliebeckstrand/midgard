import { Field, Label } from 'ui/fieldset'
import { Slider } from 'ui/slider'

export default function Disabled() {
	return (
		<Field>
			<Label>Volume</Label>
			<Slider disabled defaultValue={50} />
		</Field>
	)
}

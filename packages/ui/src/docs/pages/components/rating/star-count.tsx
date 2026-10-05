import { Field, Label } from 'ui/fieldset'
import { Rating } from 'ui/rating'

export default function StarCount() {
	return (
		<>
			<Field>
				<Label>Spice level</Label>
				<Rating count={3} defaultValue={2} />
			</Field>
			<Field>
				<Label>Overall score</Label>
				<Rating count={10} defaultValue={7} />
			</Field>
		</>
	)
}

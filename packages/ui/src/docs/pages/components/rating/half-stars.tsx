import { Field, Label } from 'ui/fieldset'
import { Rating } from 'ui/rating'

export default function HalfStars() {
	return (
		<Field>
			<Label as="span">Rate your stay</Label>
			<Rating step={0.5} defaultValue={3.5} />
		</Field>
	)
}

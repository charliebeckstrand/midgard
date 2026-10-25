import { Field, Label } from 'ui/fieldset'
import { Rating } from 'ui/rating'
import { levels } from './levels.ts'

export default function NamedLevels() {
	return (
		<Field>
			<Label as="span">Service</Label>
			<Rating defaultValue={4} getValueText={(value) => `${value} of 5, ${levels[value]}`} />
		</Field>
	)
}

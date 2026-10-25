import { Field, Label } from 'ui/fieldset'
import { Rating } from 'ui/rating'
import { words } from '../../../data/words.ts'

const levels = Object.values(
	words('service-level', {
		unrated: 'Unrated',
		poor: 'Poor',
		fair: 'Fair',
		good: 'Good',
		great: 'Great',
		excellent: 'Excellent',
	}),
)

export default function NamedLevels() {
	return (
		<Field>
			<Label as="span">Service</Label>
			<Rating defaultValue={4} getValueText={(value) => `${value} of 5, ${levels[value]}`} />
		</Field>
	)
}

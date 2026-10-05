import { Description, Field, Label } from 'ui/fieldset'
import { RangeSlider } from 'ui/slider'

export default function ClampedRange() {
	return (
		<Field>
			<Label>Working hours</Label>
			<Description>The start time cannot pass the end time.</Description>
			<RangeSlider
				max={24}
				defaultValue={[9, 17]}
				allowCross={false}
				labels={['Start', 'End']}
				getValueText={(value) => `${value}:00`}
			/>
		</Field>
	)
}

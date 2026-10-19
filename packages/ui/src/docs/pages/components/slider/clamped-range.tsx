import { Field, Label } from 'ui/fieldset'
import { useIntl } from 'ui/primitives/intl'
import { RangeSlider } from 'ui/slider'

export default function ClampedRange() {
	const intl = useIntl()

	return (
		<Field>
			<Label>Working hours</Label>
			<RangeSlider
				max={24}
				defaultValue={[9, 17]}
				allowCross={false}
				labels={['Start', 'End']}
				getValueText={(value) => intl.formatTime(new Date(2026, 0, 1, value))}
			/>
		</Field>
	)
}

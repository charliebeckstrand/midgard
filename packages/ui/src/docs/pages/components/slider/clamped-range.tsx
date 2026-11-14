import { Field, Label } from 'ui/fieldset'
import { useDateFormat } from 'ui/providers/locale'
import { RangeSlider } from 'ui/slider'

export default function ClampedRange() {
	// The text of a time waits for hydration (`useDateFormat`).
	const hourFormat = useDateFormat({ hour: 'numeric', minute: 'numeric' })

	return (
		<Field>
			<Label>Working hours</Label>
			<RangeSlider
				max={24}
				defaultValue={[9, 17]}
				allowCross={false}
				labels={['Start', 'End']}
				getValueText={(value) => hourFormat?.format(new Date(2026, 0, 1, value)) ?? String(value)}
			/>
		</Field>
	)
}

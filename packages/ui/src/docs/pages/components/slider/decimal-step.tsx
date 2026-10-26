import { Field, Label } from 'ui/fieldset'
import { useIntl } from 'ui/primitives/intl'
import { Slider } from 'ui/slider'

export default function DecimalStep() {
	const intl = useIntl()

	return (
		<Field>
			<Label>Playback speed</Label>
			<Slider
				min={0.5}
				max={2}
				step={0.25}
				defaultValue={1}
				getValueText={(value) => `${intl.formatNumber(value)} times normal speed`}
			/>
		</Field>
	)
}

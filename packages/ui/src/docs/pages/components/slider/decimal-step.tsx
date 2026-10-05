import { Field, Label } from 'ui/fieldset'
import { Slider } from 'ui/slider'

export default function DecimalStep() {
	return (
		<Field>
			<Label>Playback speed</Label>
			<Slider
				min={0.5}
				max={2}
				step={0.25}
				defaultValue={1}
				getValueText={(value) => `${value} times normal speed`}
			/>
		</Field>
	)
}

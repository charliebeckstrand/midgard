import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Slider } from 'ui/slider'
import { Text } from 'ui/text'

export default function Controlled() {
	const [volume, setVolume] = useState(50)

	return (
		<>
			<Field>
				<Label>Volume</Label>
				<Slider value={volume} onValueChange={setVolume} />
			</Field>
			<Text>Value: {volume}</Text>
		</>
	)
}

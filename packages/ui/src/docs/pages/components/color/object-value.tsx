import { useState } from 'react'
import { ColorPicker, type Hsva } from 'ui/color'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'

export default function ObjectValue() {
	const [color, setColor] = useState<Hsva>({ h: 280, s: 70, v: 90, a: 1 })

	return (
		<>
			<Field>
				<Label>Highlight color</Label>
				<ColorPicker format="hsva" value={color} onValueChange={setColor} />
			</Field>
			<Text>Value: {JSON.stringify(color)}</Text>
		</>
	)
}

import { useState } from 'react'
import { ColorPanel } from 'ui/color'
import { Text } from 'ui/text'

export default function InlinePanel() {
	const [color, setColor] = useState('#3b82f6')

	return (
		<>
			<ColorPanel value={color} onValueChange={setColor} />
			<Text>Value: {color}</Text>
		</>
	)
}

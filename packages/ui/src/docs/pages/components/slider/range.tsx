import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { RangeSlider } from 'ui/slider'
import { Text } from 'ui/text'

export default function Range() {
	const [price, setPrice] = useState<[number, number]>([200, 800])

	return (
		<>
			<Field>
				<Label>Price</Label>
				<RangeSlider
					max={1000}
					step={10}
					value={price}
					onValueChange={setPrice}
					labels={['Minimum', 'Maximum']}
					getValueText={(value) => `$${value}`}
				/>
			</Field>
			<Text>
				Value: ${price[0]} to ${price[1]}
			</Text>
		</>
	)
}

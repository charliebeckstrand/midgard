import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { useIntl } from 'ui/primitives/intl'
import { RangeSlider } from 'ui/slider'
import { Text } from 'ui/text'

const currency = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

export default function Range() {
	const intl = useIntl()

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
					getValueText={(value) => intl.formatNumber(value, currency)}
				/>
			</Field>
			<Text>
				Value: {intl.formatNumber(price[0], currency)} to {intl.formatNumber(price[1], currency)}
			</Text>
		</>
	)
}

import { useState } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
import { Label } from 'ui/fieldset'
import { Text } from 'ui/text'

const toppings = ['Cheese', 'Mushrooms', 'Olives']

export default function SelectAll() {
	const [selected, setSelected] = useState(['Cheese'])

	return (
		<>
			<CheckboxGroup aria-label="Toppings">
				<CheckboxField>
					<Checkbox
						checked={selected.length === toppings.length}
						indeterminate={selected.length > 0 && selected.length < toppings.length}
						onChange={(event) => setSelected(event.target.checked ? toppings : [])}
					/>
					<Label>All toppings</Label>
				</CheckboxField>
				{toppings.map((topping) => (
					<CheckboxField key={topping}>
						<Checkbox
							checked={selected.includes(topping)}
							onChange={(event) =>
								setSelected(
									toppings.filter((item) =>
										item === topping ? event.target.checked : selected.includes(item),
									),
								)
							}
						/>
						<Label>{topping}</Label>
					</CheckboxField>
				))}
			</CheckboxGroup>
			<Text>Value: {selected.length > 0 ? selected.join(', ') : 'Empty'}</Text>
		</>
	)
}

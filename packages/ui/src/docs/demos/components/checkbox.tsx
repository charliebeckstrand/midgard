import { useState } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../../components/checkbox'
import { Description, Label } from '../../../components/fieldset'
import { Axes, Example } from '../../engine'

const toppings = ['Cheese', 'Mushrooms', 'Olives']

export default function Demo() {
	const [selected, setSelected] = useState<readonly string[]>(['Cheese'])

	return (
		<>
			<Axes
				of="Checkbox"
				captions={false}
				omit={['indeterminate']}
				render={(props, label) => (
					<CheckboxField>
						<Checkbox {...props} defaultChecked />
						<Label>{label}</Label>
					</CheckboxField>
				)}
			/>

			<Example title="With description">
				<CheckboxField>
					<Checkbox />
					<Label>Accept terms and conditions</Label>
					<Description>You agree to our Terms of Service and Privacy Policy.</Description>
				</CheckboxField>
			</Example>

			<Example title="Group">
				<CheckboxGroup aria-label="Notifications">
					<CheckboxField>
						<Checkbox />
						<Label>Subscribe to newsletter</Label>
						<Description>Get the latest news and updates.</Description>
					</CheckboxField>

					<CheckboxField>
						<Checkbox />
						<Label>Opt out of data collection</Label>
						<Description>We will not collect any personal data.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>

			<Example title="Select all">
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
									setSelected((prev) =>
										event.target.checked
											? toppings.filter((t) => t === topping || prev.includes(t))
											: prev.filter((t) => t !== topping),
									)
								}
							/>
							<Label>{topping}</Label>
						</CheckboxField>
					))}
				</CheckboxGroup>
			</Example>

			<Example title="Disabled">
				<CheckboxGroup aria-label="Options">
					<CheckboxField>
						<Checkbox disabled />
						<Label>Disabled option</Label>
						<Description>This checkbox is disabled and cannot be interacted with.</Description>
					</CheckboxField>
				</CheckboxGroup>
			</Example>
		</>
	)
}

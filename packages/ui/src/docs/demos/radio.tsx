import { Description, Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Example } from '../components/example'

const plans = ['Starter', 'Business', 'Enterprise'] as const
const colors = ['blue', 'green', 'red'] as const

export function Demo() {
	return (
		<>
			<Example title="Default">
				<RadioGroup aria-label="Plan">
					{plans.map((plan) => (
						<RadioField key={plan}>
							<Radio name="plan" value={plan} defaultChecked={plan === 'Starter'} />
							<Label>{plan}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example title="Colors">
				<RadioGroup aria-label="Color">
					{colors.map((color) => (
						<RadioField key={color}>
							<Radio name="color" value={color} color={color} defaultChecked={color === 'blue'} />
							<Label>{color}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example title="Disabled">
				<RadioGroup aria-label="Options">
					<RadioField>
						<Radio name="option" value="enabled" defaultChecked />
						<Label>Enabled option</Label>
					</RadioField>
					<RadioField>
						<Radio name="option" value="enabled-2" />
						<Label>Enabled option</Label>
					</RadioField>
					<RadioField>
						<Radio name="option" value="disabled" disabled />
						<Label>Disabled option</Label>
						<Description>This radio button is disabled and cannot be interacted with.</Description>
					</RadioField>
				</RadioGroup>
			</Example>
		</>
	)
}

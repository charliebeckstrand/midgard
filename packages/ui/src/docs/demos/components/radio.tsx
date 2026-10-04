import { Description, Label } from '../../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { Axes, Example } from '../../engine'

const plans = ['Starter', 'Business', 'Enterprise'] as const

export default function Demo() {
	return (
		<>
			<Axes
				of="Radio"
				captions={false}
				render={(props, label) => (
					<RadioField>
						<Radio {...props} defaultChecked />
						<Label>{label}</Label>
					</RadioField>
				)}
			/>

			<Example title="Radio group">
				<RadioGroup aria-label="Plan">
					{plans.map((plan) => (
						<RadioField key={plan}>
							<Radio name="plan" value={plan} defaultChecked={plan === 'Starter'} />
							<Label>{plan}</Label>
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

import { Description, Label } from '../../../components/fieldset'
import { Switch, SwitchField } from '../../../components/switch'
import { Example } from '../../engine'

const sizes = [
	{
		value: 'sm',
		label: 'Small',
	},
	{
		value: 'md',
		label: 'Medium',
	},
	{
		value: 'lg',
		label: 'Large',
	},
] as const

export function Demo() {
	return (
		<>
			<Example title="Default">
				<SwitchField>
					<Label>Notifications</Label>
					<Description>Receive email notifications for new activity.</Description>
					<Switch />
				</SwitchField>
			</Example>

			<Example title="Sizes">
				{sizes.map(({ value, label }) => (
					<SwitchField key={value}>
						<Label>{label}</Label>
						<Switch size={value} defaultChecked />
					</SwitchField>
				))}
			</Example>

			<Example title="Colors">
				<SwitchField>
					<Label>Blue</Label>
					<Switch color="blue" defaultChecked />
				</SwitchField>
				<SwitchField>
					<Label>Green</Label>
					<Switch color="green" defaultChecked />
				</SwitchField>
				<SwitchField>
					<Label>Red</Label>
					<Switch color="red" defaultChecked />
				</SwitchField>
			</Example>

			<Example title="Disabled">
				<SwitchField>
					<Label>Disabled</Label>
					<Description>This switch is disabled.</Description>
					<Switch disabled />
				</SwitchField>
			</Example>
		</>
	)
}

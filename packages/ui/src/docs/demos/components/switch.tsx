import { Description, Label } from '../../../components/fieldset'
import { Switch, SwitchField } from '../../../components/switch'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Switch"
				captions={false}
				render={(props, label) => (
					<SwitchField>
						<Label>{label}</Label>
						<Switch {...props} defaultChecked />
					</SwitchField>
				)}
			/>

			<Example title="With description">
				<SwitchField>
					<Label>Notifications</Label>
					<Description>Receive email notifications for new activity.</Description>
					<Switch />
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

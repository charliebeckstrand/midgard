import { useState } from 'react'
import { Description, Label } from '../../components/fieldset'
import { Switch, SwitchField } from '../../components/switch'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export function Demo() {
	const [size, setSize] = useState<Size>('md')

	return (
		<>
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onValueChange={setSize} />}
			>
				<SwitchField size={size}>
					<Label>Notifications</Label>
					<Description>Receive email notifications for new activity.</Description>
					<Switch size={size} />
				</SwitchField>
			</Example>

			<Example title="Sizes">
				<SwitchField size="sm">
					<Label>Small</Label>
					<Switch size="sm" />
				</SwitchField>
				<SwitchField size="md">
					<Label>Medium</Label>
					<Switch size="md" defaultChecked />
				</SwitchField>
				<SwitchField size="lg">
					<Label>Large</Label>
					<Switch size="lg" />
				</SwitchField>
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

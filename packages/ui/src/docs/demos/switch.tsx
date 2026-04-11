'use client'

import { useState } from 'react'
import { Description, Label } from '../../components/fieldset'
import { Switch, SwitchField } from '../../components/switch'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export default function SwitchDemo() {
	const [size, setSize] = useState<Size>('md')

	return (
		<div className="space-y-8">
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onChange={setSize} />}
			>
				<div className="space-y-6">
					<SwitchField size={size}>
						<Label htmlFor="switch-notifications">Notifications</Label>
						<Description>Receive email notifications for new activity.</Description>
						<Switch id="switch-notifications" size={size} />
					</SwitchField>
					<SwitchField size={size}>
						<Label htmlFor="switch-dark-mode">Dark mode</Label>
						<Description>Use the dark color scheme.</Description>
						<Switch id="switch-dark-mode" defaultChecked color="blue" size={size} />
					</SwitchField>
				</div>
			</Example>
			<Example title="Sizes">
				<div className="space-y-6">
					<SwitchField size="sm">
						<Label htmlFor="switch-sm">Small</Label>
						<Switch id="switch-sm" size="sm" />
					</SwitchField>
					<SwitchField size="md">
						<Label htmlFor="switch-md">Medium</Label>
						<Switch id="switch-md" size="md" defaultChecked />
					</SwitchField>
					<SwitchField size="lg">
						<Label htmlFor="switch-lg">Large</Label>
						<Switch id="switch-lg" size="lg" />
					</SwitchField>
				</div>
			</Example>
			<Example title="Colors">
				<div className="space-y-6">
					<SwitchField>
						<Label htmlFor="switch-purple">Blue</Label>
						<Switch id="switch-purple" color="blue" defaultChecked />
					</SwitchField>
					<SwitchField>
						<Label htmlFor="switch-green">Green</Label>
						<Switch id="switch-green" color="green" defaultChecked />
					</SwitchField>
					<SwitchField>
						<Label htmlFor="switch-red">Red</Label>
						<Switch id="switch-red" color="red" defaultChecked />
					</SwitchField>
				</div>
			</Example>
			<Example title="Disabled">
				<SwitchField>
					<Label htmlFor="switch-disabled">Disabled</Label>
					<Description>This switch is disabled.</Description>
					<Switch id="switch-disabled" disabled />
				</SwitchField>
			</Example>
		</div>
	)
}

'use client'

import { useState } from 'react'
import { Description, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { Switch, SwitchField } from '../../components/switch'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Forms' }

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export default function SwitchDemo() {
	const [size, setSize] = useState<Size>('md')

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onChange={setSize} />}
			>
				<SwitchField size={size}>
					<Label htmlFor="switch-notifications">Notifications</Label>
					<Description>Receive email notifications for new activity.</Description>
					<Switch id="switch-notifications" size={size} />
				</SwitchField>
			</Example>

			<Example title="Sizes">
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
			</Example>

			<Example title="Colors">
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
			</Example>

			<Example title="Disabled">
				<SwitchField>
					<Label htmlFor="switch-disabled">Disabled</Label>
					<Description>This switch is disabled.</Description>
					<Switch id="switch-disabled" disabled />
				</SwitchField>
			</Example>
		</Stack>
	)
}

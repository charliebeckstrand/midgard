import { Fieldset, Label, Legend } from '../../../components/fieldset'
import { Switch, SwitchField } from '../../../components/switch'
import { debugTools } from './registry'
import { setDebugTool, useDebugTools } from './store'

/** The Debug section of the settings dialog: one switch for each tool in {@link debugTools}. */
export function DebugSettings() {
	const enabled = useDebugTools()

	return (
		<Fieldset>
			<Legend>Debug</Legend>
			{debugTools.map((tool) => (
				<SwitchField key={tool.id}>
					<Label>{tool.label}</Label>
					<Switch
						checked={enabled.includes(tool.id)}
						onChange={(event) => setDebugTool(tool.id, event.target.checked)}
					/>
				</SwitchField>
			))}
		</Fieldset>
	)
}

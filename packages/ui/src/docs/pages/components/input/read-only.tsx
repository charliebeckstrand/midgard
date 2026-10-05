import { Description, Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'

export default function ReadOnly() {
	return (
		<Field>
			<Label>Workspace ID</Label>
			<Description>The ID is set when the workspace is created.</Description>
			<Input readOnly defaultValue="ws_8f3a2c" />
		</Field>
	)
}

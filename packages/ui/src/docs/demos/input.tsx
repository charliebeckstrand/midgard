import { Field, Label } from '../../components/fieldset'
import { Input, InputGroup } from '../../components/input'

export const meta = { category: 'Forms' }

export default function InputDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label htmlFor="input-default">Default</Label>
				<Input id="input-default" placeholder="Enter text…" />
			</Field>
			<Field>
				<Label htmlFor="input-disabled">Disabled</Label>
				<Input id="input-disabled" disabled placeholder="Disabled" />
			</Field>
			<Field>
				<Label htmlFor="input-invalid">Invalid</Label>
				<Input id="input-invalid" invalid placeholder="Invalid input" />
			</Field>
			<Field>
				<Label htmlFor="input-group">With input group</Label>
				<InputGroup>
					<Input id="input-group" placeholder="Search…" />
				</InputGroup>
			</Field>
		</div>
	)
}

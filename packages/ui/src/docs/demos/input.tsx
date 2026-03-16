import { Field, Label } from '../../components/fieldset'
import { Input, InputGroup } from '../../components/input'

export const meta = { category: 'Forms' }

export default function InputDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label>Default</Label>
				<Input placeholder="Enter text…" />
			</Field>
			<Field>
				<Label>Disabled</Label>
				<Input disabled placeholder="Disabled" />
			</Field>
			<Field>
				<Label>Invalid</Label>
				<Input invalid placeholder="Invalid input" />
			</Field>
			<Field>
				<Label>With input group</Label>
				<InputGroup>
					<Input placeholder="Search…" />
				</InputGroup>
			</Field>
		</div>
	)
}

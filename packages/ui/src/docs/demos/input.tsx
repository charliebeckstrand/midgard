import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'

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
				<Label>Readonly</Label>
				<Input readOnly placeholder="Readonly" />
			</Field>
			<Field>
				<Label>Invalid</Label>
				<Input data-invalid placeholder="Invalid input" />
			</Field>
		</div>
	)
}

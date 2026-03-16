import { Field, Label } from '../../components/fieldset'
import { Select } from '../../components/select'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label>Country</Label>
				<Select>
					<option value="">Select a country…</option>
					<option>United States</option>
					<option>Canada</option>
					<option>United Kingdom</option>
					<option>Australia</option>
				</Select>
			</Field>
			<Field>
				<Label>Disabled</Label>
				<Select disabled>
					<option>Cannot change</option>
				</Select>
			</Field>
		</div>
	)
}

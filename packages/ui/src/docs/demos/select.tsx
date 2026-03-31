import { Field, Label } from '../../components/fieldset'
import { Select } from '../../components/select'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label htmlFor="select-country">Country</Label>
				<Select id="select-country">
					<option value="" disabled selected>
						Select a country…
					</option>
					<option>United States</option>
					<option>Canada</option>
					<option>United Kingdom</option>
					<option>Australia</option>
				</Select>
			</Field>
			<Field>
				<Label htmlFor="select-disabled">Disabled</Label>
				<Select id="select-disabled" disabled>
					<option>Cannot change</option>
				</Select>
			</Field>
		</div>
	)
}

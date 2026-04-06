import { Field, Label } from '../../components/fieldset'
import { Select } from '../../components/select'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={`import { Field, Label } from 'ui/fieldset'
import { Select } from 'ui/select'

<Field className="max-w-sm">
	<Label>Country</Label>
	<Select>
		<option value="" disabled selected>Select a country…</option>
		<option>United States</option>
		<option>Canada</option>
	</Select>
</Field>`}
			>
				<Field className="max-w-sm">
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
			</Example>
			<Example
				title="Disabled"
				code={`import { Field, Label } from 'ui/fieldset'
import { Select } from 'ui/select'

<Field className="max-w-sm">
	<Label>Disabled</Label>
	<Select disabled>
		<option>Cannot change</option>
	</Select>
</Field>`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="select-disabled">Disabled</Label>
					<Select id="select-disabled" disabled>
						<option>Cannot change</option>
					</Select>
				</Field>
			</Example>
		</div>
	)
}

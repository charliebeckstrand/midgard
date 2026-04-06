import { Field, Label } from '../../components/fieldset'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={`import { Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'

<Field className="max-w-sm">
	<Label>Country</Label>
	<Select placeholder="Select a country…" displayValue={(v) => v}>
		<SelectOption value="United States">
			<SelectLabel>United States</SelectLabel>
		</SelectOption>
		<SelectOption value="Canada">
			<SelectLabel>Canada</SelectLabel>
		</SelectOption>
		<SelectOption value="United Kingdom">
			<SelectLabel>United Kingdom</SelectLabel>
		</SelectOption>
	</Select>
</Field>`}
			>
				<Field className="max-w-sm">
					<Label>Country</Label>
					<Select placeholder="Select a country…" displayValue={(v: string) => v}>
						<SelectOption value="United States">
							<SelectLabel>United States</SelectLabel>
						</SelectOption>
						<SelectOption value="Canada">
							<SelectLabel>Canada</SelectLabel>
						</SelectOption>
						<SelectOption value="United Kingdom">
							<SelectLabel>United Kingdom</SelectLabel>
						</SelectOption>
						<SelectOption value="Australia">
							<SelectLabel>Australia</SelectLabel>
						</SelectOption>
					</Select>
				</Field>
			</Example>
		</div>
	)
}

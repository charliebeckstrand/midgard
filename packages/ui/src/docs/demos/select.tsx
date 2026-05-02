import { Field, Label } from '../../components/fieldset'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Field>
					<Label>Country</Label>
					<Select placeholder="Select a country" displayValue={(v: string) => v}>
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
		</Stack>
	)
}

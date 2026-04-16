import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function SelectDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer>
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
				</Sizer>
			</Example>

			<Example title="Glass">
				<Glass>
					<Sizer>
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
					</Sizer>
				</Glass>
			</Example>
		</Stack>
	)
}

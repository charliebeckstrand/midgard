import { Field, Label } from '../../../components/fieldset'
import {
	Select,
	SelectDescription,
	SelectLabel,
	SelectOption,
	SelectText,
} from '../../../components/select'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export function Demo() {
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

			{/* SelectText stacks a label over its description. */}
			<Example title="Stacked text">
				<Field>
					<Label>Plan</Label>
					<Select placeholder="Select a plan" displayValue={(v: string) => v}>
						<SelectOption value="Starter">
							<SelectText>
								<SelectLabel>Starter</SelectLabel>
								<SelectDescription>One board and a week of history</SelectDescription>
							</SelectText>
						</SelectOption>
						<SelectOption value="Team">
							<SelectText>
								<SelectLabel>Team</SelectLabel>
								<SelectDescription>Shared boards for up to ten people</SelectDescription>
							</SelectText>
						</SelectOption>
						<SelectOption value="Business">
							<SelectText>
								<SelectLabel>Business</SelectLabel>
								<SelectDescription>Single sign-on and audit logs</SelectDescription>
							</SelectText>
						</SelectOption>
					</Select>
				</Field>
			</Example>
		</Stack>
	)
}

import { Field, Label } from '../../../components/fieldset'
import {
	Select,
	SelectDescription,
	SelectLabel,
	SelectOption,
	SelectText,
} from '../../../components/select'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

// The selected value starts in lower case and is long, so the `capitalize` and
// `truncate` axes show a change.
const stages = ['awaiting approval from finance', 'in review', 'shipped']

export function Demo() {
	return (
		<Stack gap="xl">
			<Axes
				of="Select"
				omit={['placement', 'open', 'multiple', 'required', 'nullable']}
				render={(props, label) => (
					<div className="w-48">
						<Select
							{...props}
							aria-label={label}
							defaultValue={stages[0]}
							displayValue={(v: string) => v}
						>
							{stages.map((stage) => (
								<SelectOption key={stage} value={stage}>
									<SelectLabel>{stage}</SelectLabel>
								</SelectOption>
							))}
						</Select>
					</div>
				)}
			/>

			<Example title="In a field">
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

import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

// Turn on Debug in the settings, type in each field, and open the Events
// sheet. The trail writes `***` for a password field and for a field with a
// secret `autocomplete` token. The rule does not find a secret by its
// content, so `data-events-mask` marks the API key field as secret.
export default function MaskASecret() {
	return (
		<Stack gap="md">
			<Text tone="muted">Turn on Debug in the settings, then open the Events sheet.</Text>
			<Field>
				<Label>Password</Label>
				<Input type="password" autoComplete="current-password" />
			</Field>
			<Field>
				<Label>One-time code</Label>
				<Input autoComplete="one-time-code" inputMode="numeric" />
			</Field>
			<Field>
				<Label>API key</Label>
				<Input data-events-mask />
			</Field>
			<Field>
				<Label>Display name</Label>
				<Input />
			</Field>
		</Stack>
	)
}

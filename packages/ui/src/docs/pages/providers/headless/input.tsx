import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { HeadlessProvider } from 'ui/providers/headless'
import { Stack } from 'ui/stack'

export default function HeadlessInput() {
	return (
		<Stack gap="md">
			<Field>
				<Label>With chrome</Label>
				<Input placeholder="Bordered input" />
			</Field>
			<Field>
				<Label>Bare element</Label>
				<HeadlessProvider>
					<Input placeholder="Bare input" />
				</HeadlessProvider>
			</Field>
		</Stack>
	)
}

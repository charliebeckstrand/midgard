import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Headless } from '../../components/headless'
import { Input } from '../../components/input'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Providers' }

export function Demo() {
	return (
		<>
			<Example title="Input">
				<Stack gap="md">
					<Field>
						<Label>With chrome</Label>
						<Input placeholder="Bordered input" />
					</Field>
					<Field>
						<Label>Bare element</Label>
						<Headless>
							<Input placeholder="Bare input" />
						</Headless>
					</Field>
				</Stack>
			</Example>

			<Example title="Button">
				<Flex gap="md" align="center">
					<Button>With chrome</Button>
					<Headless>
						<Button>Bare element</Button>
					</Headless>
				</Flex>
			</Example>

			<Example title="Custom wrapper">
				<Stack gap="md">
					<Text variant="muted">
						Wrap a Headless-aware child when you're composing your own chrome around it — the
						descendant renders the bare semantic element while form wiring, disabled state, and ref
						forwarding stay intact.
					</Text>
					<Flex
						align="center"
						gap="sm"
						className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus-within:border-zinc-500"
					>
						<Headless>
							<Input placeholder="Type a message…" />
						</Headless>
						<Headless>
							<Button>Send</Button>
						</Headless>
					</Flex>
				</Stack>
			</Example>
		</>
	)
}

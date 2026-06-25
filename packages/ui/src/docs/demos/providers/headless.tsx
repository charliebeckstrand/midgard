import { Example } from 'docs'
import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Flex } from '../../../components/flex'
import { Input } from '../../../components/input'
import { Stack } from '../../../components/stack'
import { HeadlessProvider } from '../../../providers/headless'

export const meta = { name: 'Headless Provider' }

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
						<HeadlessProvider>
							<Input placeholder="Bare input" />
						</HeadlessProvider>
					</Field>
				</Stack>
			</Example>

			<Example title="Button">
				<Flex gap="md" align="center">
					<Button>With chrome</Button>
					<HeadlessProvider>
						<Button>Bare element</Button>
					</HeadlessProvider>
				</Flex>
			</Example>
		</>
	)
}

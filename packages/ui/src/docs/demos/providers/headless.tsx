import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Flex } from '../../../components/flex'
import { Headless } from '../../../components/headless'
import { Input } from '../../../components/input'
import { Stack } from '../../../components/stack'
import { Example } from '../../components/example'

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
		</>
	)
}

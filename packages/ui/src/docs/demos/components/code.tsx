import { Code, CodeBlock } from '../../../components/code'
import { Text } from '../../../components/text'
import { Axes, code, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes of="Code" render={(props) => <Code {...props}>pnpm install</Code>} />

			<Example title="Inline with text">
				<Text>
					Run <Code>pnpm install</Code> to install dependencies.
				</Text>
			</Example>

			<Example title="Code block">
				<CodeBlock
					code={code`
						import { Button } from 'ui/button'

						export function Example() {
							return <Button color="blue">Click me</Button>
						}
					`}
				/>
			</Example>

			<Example title="With language">
				<CodeBlock lang="bash" code="pnpm add ui" />
			</Example>
		</>
	)
}

import { useState } from 'react'
import { Code, CodeBlock } from '../../components/code'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Data Display' }

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export function Demo() {
	const [size, setSize] = useState<Size>('md')

	return (
		<>
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onValueChange={setSize} />}
			>
				<Text>
					Run <Code size={size}>pnpm install</Code> to install dependencies.
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

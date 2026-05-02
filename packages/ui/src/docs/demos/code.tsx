'use client'

import { useState } from 'react'
import { Code, CodeBlock } from '../../components/code'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Data Display' }

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export default function CodeDemo() {
	const [size, setSize] = useState<Size>('md')

	return (
		<Stack gap="xl">
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onChange={setSize} />}
			>
				<Text>
					Run <Code size={size}>pnpm install</Code> to install dependencies.
				</Text>
			</Example>

			<Example
				title="Code block"
				code={code`
					import { CodeBlock } from 'ui/code'

					<CodeBlock code={source} />
				`}
			>
				<CodeBlock
					code={code`
						import { Button } from 'ui/button'

						export function Example() {
							return <Button color="blue">Click me</Button>
						}
					`}
				/>
			</Example>

			<Example
				title="Block with language"
				code={code`
					import { CodeBlock } from 'ui/code'

					<CodeBlock inline lang="bash" code="pnpm add ui" />
				`}
			>
				<CodeBlock inline lang="bash" code="pnpm add ui" />
			</Example>
		</Stack>
	)
}

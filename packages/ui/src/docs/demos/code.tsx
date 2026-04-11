'use client'

import { useState } from 'react'
import { Code, CodeBlock } from '../../components/code'
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
		<div className="space-y-8">
			<Example
				title="Default"
				actions={<SizeListbox sizes={sizes} value={size} onChange={setSize} />}
				code={code`
					import { Code } from 'ui/code'

					<Text>
						Run <Code>pnpm install</Code> to install dependencies.
					</Text>
				`}
			>
				<Text>
					Run <Code size={size}>pnpm install</Code> to install dependencies.
				</Text>
			</Example>
			<Example
				title="Inline code"
				code={code`
					import { Code } from 'ui/code'

					<Text>
						Run <Code>pnpm install</Code> to install dependencies, then call{' '}
						<Code>{'codeToHtml()'}</Code> to highlight a snippet.
					</Text>
				`}
			>
				<Text>
					Run <Code>pnpm install</Code> to install dependencies, then call{' '}
					<Code>{'codeToHtml()'}</Code> to highlight a snippet.
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

					<CodeBlock lang="bash" code="pnpm add ui" inline />
				`}
			>
				<CodeBlock lang="bash" code="pnpm add ui" inline />
			</Example>
		</div>
	)
}

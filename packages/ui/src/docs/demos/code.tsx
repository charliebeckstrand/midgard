import { Code, CodeBlock } from '../../components/code'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function CodeDemo() {
	return (
		<div className="space-y-8">
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

					<CodeBlock lang="bash" code="pnpm add ui" />
				`}
			>
				<CodeBlock lang="bash" code="pnpm add ui" />
			</Example>
		</div>
	)
}

import { code, Example } from 'docs'
import { Markdown } from '../../components/markdown'

const prose = code`
	# Markdown

	Render **Markdown** as styled prose with [marked](https://marked.js.org) —
	_emphasis_, \`inline code\`, and [links](https://example.com) all render.

	## Lists

	- First item
	- Second item
	  - Nested item
	- Third item

	> Blockquotes set an aside off from the surrounding copy.

	\`\`\`ts
	export function greet(name) {
		return 'Hello, ' + name
	}
	\`\`\`
`

const ProseDemo = () => {
	return <Markdown>{prose}</Markdown>
}

export function Demo() {
	return (
		<Example title="Prose">
			<ProseDemo />
		</Example>
	)
}

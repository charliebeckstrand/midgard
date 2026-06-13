import { Markdown } from '../../components/markdown'
import { code } from '../code'
import { Example } from '../components/example'

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

const gfm = code`
	## GitHub-flavored

	| Feature       | Supported  |
	| ------------- | ---------- |
	| Tables        | Yes        |
	| Strikethrough | ~~No~~ Yes |

	- [x] Task lists
	- [ ] Pending item
`

// Rendering a raw Markdown string as children has no clean derived form, so
// each Example shows the idiomatic call instead.
const usage = code`
	import { Markdown } from 'ui/markdown'

	<Markdown>{content}</Markdown>
`

export function Demo() {
	return (
		<>
			<Example title="Prose" code={usage}>
				<Markdown>{prose}</Markdown>
			</Example>

			<Example title="GitHub-flavored" code={usage}>
				<Markdown>{gfm}</Markdown>
			</Example>
		</>
	)
}

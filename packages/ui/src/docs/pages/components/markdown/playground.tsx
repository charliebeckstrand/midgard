import { Markdown, type MarkdownProps } from 'ui/markdown'

const prose = `
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

export default function MarkdownPlayground(props: MarkdownProps) {
	return <Markdown {...props}>{prose}</Markdown>
}

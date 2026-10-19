import { Markdown, type MarkdownProps } from 'ui/markdown'

const prose = `
# Release notes

Version 2.4 adds **search in attachments**. Run \`app update\` to get it, or
read the _full list_ of [changes](https://example.com).

## Changes

- Search finds the text in attachments
- Shared folders show who changed each file
  - The list shows the last ten changes
- The dark theme follows the setting of your system

> Back up your files before you update.

\`\`\`ts
export function isLatest(version: string) {
	return version === '2.4'
}
\`\`\`
`

export default function MarkdownPlayground(props: MarkdownProps) {
	return (
		<Markdown headingOffset={2} {...props}>
			{prose}
		</Markdown>
	)
}

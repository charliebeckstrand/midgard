import { Button } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Heading } from '../../../components/heading'
import { HoldButton } from '../../../components/hold-button'
import { Markdown } from '../../../components/markdown'
import { ShinyText } from '../../../components/shiny-text'
import { Text } from '../../../components/text'
import type { Case } from './types'

// Trusted GFM source exercising the prose tree the gate asserts: heading order
// (h1 → h2), a named link, an emphasized run, strikethrough, a list, and a GFM
// table with a real header row. Task lists are omitted — marked renders them as
// unlabelled disabled checkboxes, a genuine WCAG 4.1.2 defect.
const markdownSource = `# Release notes

The **Markdown** component renders trusted [GitHub-flavored Markdown](https://github.github.com/gfm/) as prose.

## Highlights

- Tables, ~~drafts~~, and autolinks like <https://example.com>
- Synchronous, server-renderable parse

| Feature   | State  |
| --------- | ------ |
| Tables    | Stable |
| Autolinks | Stable |
`

/** Typography atoms and button actions. */
export const contentCases: readonly Case[] = [
	['button', <Button key="b">Save</Button>],
	[
		'heading + text',
		<div key="h">
			<Heading level={1}>Title</Heading>
			<Text>Body copy.</Text>
		</div>,
	],
	[
		// Static prose leaf: parses trusted GFM to a styled prose tree. Structure
		// (heading order, link names, list and table wiring) is asserted here; prose
		// contrast is the browser geometry gate's concern.
		'markdown',
		<Markdown key="md">{markdownSource}</Markdown>,
	],
	[
		// Gradient-masked typography (bg-clip-text + transparent text). Structure is
		// asserted here; the swept highlight's contrast is the browser geometry gate's
		// concern.
		'shiny text',
		<ShinyText key="sh">Premium</ShinyText>,
	],
	[
		// Icon-only copy control; ships its own accessible name and a status live
		// region announcing the copied state.
		'copy button',
		<CopyButton key="cp" value="Copy me" />,
	],
	[
		// Press-and-hold action; named by its text, with aria for the hold progress.
		'hold button',
		<HoldButton key="hb">Hold to confirm</HoldButton>,
	],
]

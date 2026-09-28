import { Button, ButtonSkeleton } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Heading } from '../../../components/heading'
import { HoldButton } from '../../../components/hold-button'
import { Markdown } from '../../../components/markdown'
import { ShinyText, ShinyTextSkeleton } from '../../../components/shiny-text'
import { Text, TextSkeleton } from '../../../components/text'
import type { Case } from './types'

// Trusted GFM source exercising the prose tree the gate asserts: heading order
// (h1 → h2), a named link, an emphasized run, strikethrough, a list, and a GFM
// table with a real header row. Task lists are omitted — marked renders them as
// unlabeled disabled checkboxes, a genuine WCAG 4.1.2 defect.
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
	{
		name: 'button',
		element: <Button key="b">Save</Button>,
		skeleton: [{ element: <ButtonSkeleton />, absentSlot: 'button' }],
		link: [{ render: (href) => <Button href={href}>About</Button>, slot: 'button' }],
		density: [{ render: (size) => <Button size={size}>Save</Button>, slot: 'button' }],
	},
	{
		name: 'heading + text',
		element: (
			<div key="h">
				<Heading level={1}>Title</Heading>
				<Text>Body copy.</Text>
			</div>
		),
		passthrough: [
			{ render: (props) => <Heading {...props}>Main</Heading>, slot: 'heading' },
			{ render: (props) => <Text {...props}>Intro</Text>, slot: 'text' },
		],
		skeleton: [{ element: <TextSkeleton />, absentSlot: 'text' }],
	},
	{
		// Static prose leaf: parses trusted GFM to a styled prose tree. Structure
		// (heading order, link names, list and table wiring) is asserted here; prose
		// contrast is the browser geometry gate's concern.
		name: 'markdown',
		element: <Markdown key="md">{markdownSource}</Markdown>,
	},
	{
		// Gradient-masked typography (bg-clip-text + transparent text). Structure is
		// asserted here; the swept highlight's contrast is the browser geometry gate's
		// concern.
		name: 'shiny text',
		element: <ShinyText key="sh">Premium</ShinyText>,
		passthrough: [
			{ render: (props) => <ShinyText {...props}>Shine</ShinyText>, slot: 'shiny-text' },
		],
		skeleton: [{ element: <ShinyTextSkeleton />, absentSlot: 'shiny-text' }],
	},
	{
		// Icon-only copy control; ships its own accessible name and a status live
		// region announcing the copied state.
		name: 'copy button',
		element: <CopyButton key="cp" text="Copy me" />,
	},
	{
		// Press-and-hold action; named by its text, with aria for the hold progress.
		name: 'hold button',
		element: <HoldButton key="hb">Hold to confirm</HoldButton>,
		passthrough: [
			{ render: (props) => <HoldButton {...props}>Hold</HoldButton>, slot: 'hold-button' },
		],
	},
]

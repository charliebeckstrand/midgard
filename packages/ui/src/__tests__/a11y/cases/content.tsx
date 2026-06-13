import { Button } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Heading } from '../../../components/heading'
import { HoldButton } from '../../../components/hold-button'
import { ShinyText } from '../../../components/shiny-text'
import { Text } from '../../../components/text'
import type { Case } from './types'

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

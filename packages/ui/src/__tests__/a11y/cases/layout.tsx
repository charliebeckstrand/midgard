import { AspectRatio } from '../../../components/aspect-ratio'
import { Box } from '../../../components/box'
import { Card, CardBody, CardTitle } from '../../../components/card'
import { Container } from '../../../components/container'
import { Divider } from '../../../components/divider'
import { Flex } from '../../../components/flex'
import { Group } from '../../../components/group'
import { Placeholder } from '../../../components/placeholder'
import { ScrollArea } from '../../../components/scroll-area'
import { Spacer } from '../../../components/spacer'
import { Split } from '../../../components/split'
import { Stack } from '../../../components/stack'
import { GlassProvider } from '../../../providers/glass'
import type { Case } from './types'

/** Layout & surface primitives: structural containers with no interactive role. */
export const layoutCases: readonly Case[] = [
	['box', <Box key="bx">Content</Box>],
	[
		'flex',
		<Flex key="fx" gap="md">
			<span>One</span>
			<span>Two</span>
		</Flex>,
	],
	[
		'grid',
		<Box key="gr" className="grid grid-cols-2 gap-3">
			<span>One</span>
			<span>Two</span>
		</Box>,
	],
	[
		'stack',
		<Stack key="sk" gap="md">
			<span>One</span>
			<span>Two</span>
		</Stack>,
	],
	[
		'group',
		<Group key="gp">
			<span>One</span>
			<span>Two</span>
		</Group>,
	],
	[
		'split',
		<Split key="sp">
			<span>Leading</span>
			<span>Trailing</span>
		</Split>,
	],
	['container', <Container key="ct">Content</Container>],
	[
		'card',
		<Card key="cd">
			<CardBody>
				<CardTitle>Project settings</CardTitle>
			</CardBody>
		</Card>,
	],
	[
		'glass',
		<GlassProvider key="gl">
			<span>Content</span>
		</GlassProvider>,
	],
	[
		'aspect ratio',
		<AspectRatio key="ar" ratio="square">
			<div>Content</div>
		</AspectRatio>,
	],
	['spacer', <Spacer key="sr" />],
	['divider', <Divider key="dv" />],
	['placeholder', <Placeholder key="pl" />],
	[
		'scroll area',
		<ScrollArea key="sa" className="max-h-24">
			<div className="h-48">Scrollable content</div>
		</ScrollArea>,
	],
]

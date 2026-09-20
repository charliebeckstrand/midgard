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
	{ name: 'box', element: <Box key="bx">Content</Box> },
	{
		name: 'flex',
		element: (
			<Flex key="fx" gap="md">
				<span>One</span>
				<span>Two</span>
			</Flex>
		),
	},
	{
		name: 'grid',
		element: (
			<Box key="gr" className="grid grid-cols-2 gap-3">
				<span>One</span>
				<span>Two</span>
			</Box>
		),
	},
	{
		name: 'stack',
		element: (
			<Stack key="sk" gap="md">
				<span>One</span>
				<span>Two</span>
			</Stack>
		),
	},
	{
		name: 'group',
		element: (
			<Group key="gp">
				<span>One</span>
				<span>Two</span>
			</Group>
		),
	},
	{
		name: 'split',
		element: (
			<Split key="sp">
				<span>Leading</span>
				<span>Trailing</span>
			</Split>
		),
	},
	{ name: 'container', element: <Container key="ct">Content</Container> },
	{
		name: 'card',
		element: (
			<Card key="cd">
				<CardBody>
					<CardTitle>Project settings</CardTitle>
				</CardBody>
			</Card>
		),
	},
	{
		name: 'glass',
		element: (
			<GlassProvider key="gl">
				<span>Content</span>
			</GlassProvider>
		),
	},
	{
		name: 'aspect ratio',
		element: (
			<AspectRatio key="ar" ratio="square">
				<div>Content</div>
			</AspectRatio>
		),
	},
	{ name: 'spacer', element: <Spacer key="sr" /> },
	{ name: 'divider', element: <Divider key="dv" /> },
	{ name: 'placeholder', element: <Placeholder key="pl" /> },
	{
		name: 'scroll area',
		element: (
			<ScrollArea key="sa" className="max-h-24">
				<div className="h-48">Scrollable content</div>
			</ScrollArea>
		),
	},
]

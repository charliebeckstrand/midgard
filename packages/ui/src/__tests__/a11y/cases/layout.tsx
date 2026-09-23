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
	{
		name: 'box',
		element: <Box key="bx">Content</Box>,
		passthrough: [{ render: (props) => <Box {...props}>content</Box>, slot: 'box' }],
		link: [{ render: (href) => <Box href={href}>Link</Box>, slot: 'box' }],
	},
	{
		name: 'flex',
		element: (
			<Flex key="fx" gap="md">
				<span>One</span>
				<span>Two</span>
			</Flex>
		),
		passthrough: [{ render: (props) => <Flex {...props}>content</Flex>, slot: 'flex' }],
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
		passthrough: [{ render: (props) => <Stack {...props}>content</Stack>, slot: 'stack' }],
	},
	{
		name: 'group',
		element: (
			<Group key="gp">
				<span>One</span>
				<span>Two</span>
			</Group>
		),
		density: [{ render: (size) => <Group size={size}>content</Group>, slot: 'group' }],
	},
	{
		name: 'split',
		element: (
			<Split key="sp">
				<span>Leading</span>
				<span>Trailing</span>
			</Split>
		),
		passthrough: [{ render: (props) => <Split {...props}>content</Split>, slot: 'split' }],
	},
	{
		name: 'container',
		element: <Container key="ct">Content</Container>,
		passthrough: [
			{ render: (props) => <Container {...props}>content</Container>, slot: 'container' },
		],
	},
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
		passthrough: [
			{ render: (props) => <AspectRatio {...props}>content</AspectRatio>, slot: 'aspect-ratio' },
		],
	},
	{
		name: 'spacer',
		element: <Spacer key="sr" />,
		passthrough: [{ render: (props) => <Spacer {...props} />, slot: 'spacer' }],
	},
	{
		name: 'divider',
		element: <Divider key="dv" />,
		passthrough: [{ render: (props) => <Divider {...props} />, slot: 'divider' }],
	},
	{
		name: 'placeholder',
		element: <Placeholder key="pl" />,
		passthrough: [{ render: (props) => <Placeholder {...props} />, slot: 'placeholder' }],
	},
	{
		name: 'scroll area',
		element: (
			<ScrollArea key="sa" className="max-h-24">
				<div className="h-48">Scrollable content</div>
			</ScrollArea>
		),
		passthrough: [
			{
				render: (props) => <ScrollArea {...props}>content</ScrollArea>,
				slot: 'scroll-area-viewport',
			},
		],
	},
]

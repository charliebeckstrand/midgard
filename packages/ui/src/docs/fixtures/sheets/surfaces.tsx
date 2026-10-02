import { Heart, Plus, Search, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { AspectRatio } from '../../../components/aspect-ratio'
import { Button } from '../../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../components/card'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Divider } from '../../../components/divider'
import { Group } from '../../../components/group'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Markdown } from '../../../components/markdown'
import { ScrollArea } from '../../../components/scroll-area'
import { Text } from '../../../components/text'
import { Box } from '../../../structure/box'
import { Container } from '../../../structure/container'
import { Flex } from '../../../structure/flex'
import { Spacer } from '../../../structure/spacer'
import { Split } from '../../../structure/split'
import { Stack } from '../../../structure/stack'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const ACCORDION_ITEMS = [
	{
		value: 'shipping',
		title: 'Shipping and delivery',
		body: 'Orders ship within one business day.',
	},
	{
		value: 'returns',
		title: 'Returns and refunds',
		body: 'Unworn items can be returned within 30 days.',
	},
	{
		value: 'support',
		title: 'Customer support',
		body: 'Our team replies within one business day.',
	},
]

const ACCORDION_VARIANTS = ['separated', 'outline', 'plain'] as const

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

const TEXT_TONES = ['default', 'primary', 'success', 'warning', 'error', 'muted'] as const

const TEXT_COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const TEXT_SIZES = ['xs', 'sm', 'md', 'lg'] as const

const ICON_SIZES = ['xs', 'sm', 'md', 'lg'] as const

const PARAGRAPHS = [
	'Paragraph 1. The quick brown fox jumps over the lazy dog.',
	'Paragraph 2. Sphinx of black quartz, judge my vow.',
	'Paragraph 3. Pack my box with five dozen liquor jugs.',
	'Paragraph 4. How vexingly quick daft zebras jump.',
	'Paragraph 5. The five boxing wizards jump quickly.',
	'Paragraph 6. Jackdaws love my big sphinx of quartz.',
]

const TAGS = ['react', 'typescript', 'tailwind', 'motion', 'vite', 'biome', 'pnpm', 'turborepo']

const MARKDOWN = `## Release notes

Render **Markdown** as styled prose, with _emphasis_, \`inline code\`, and [links](https://example.com).

- First item
- Second item
  - Nested item

> A blockquote sets an aside off from the copy around it.

| Name | Role |
| ---- | ---- |
| Wade | Admin |
| Ada | Editor |`

const BLOCK_COLORS = {
	blue: 'bg-blue-500/20 text-blue-900 dark:text-blue-100',
	green: 'bg-green-500/20 text-green-900 dark:text-green-100',
	amber: 'bg-amber-500/20 text-amber-900 dark:text-amber-100',
	rose: 'bg-rose-500/20 text-rose-900 dark:text-rose-100',
} as const

function Block({
	color = 'blue',
	className,
	children,
}: {
	color?: keyof typeof BLOCK_COLORS
	className?: string
	children: ReactNode
}) {
	return (
		<div className={`rounded-md px-3 py-2 text-sm ${BLOCK_COLORS[color]} ${className ?? ''}`}>
			{children}
		</div>
	)
}

export function Sheet() {
	return (
		<FixtureSheet title="Surfaces and layout">
			<FixtureGroup title="Card">
				<FixtureCase label="default">
					<Card className="w-full">
						<CardHeader>
							<CardTitle>Project settings</CardTitle>
							<CardDescription>Manage your project configuration.</CardDescription>
						</CardHeader>
						<CardBody>
							<Text>Configure the name and the visibility.</Text>
						</CardBody>
						<CardFooter>
							<Button color="blue">Save</Button>
							<Button variant="plain">Cancel</Button>
						</CardFooter>
					</Card>
				</FixtureCase>
				<FixtureCase label="bg surface, tint">
					<Card bg="surface" className="w-full">
						<CardBody>Surface</CardBody>
					</Card>
					<Card bg="tint" className="w-full">
						<CardBody>Tint</CardBody>
					</Card>
				</FixtureCase>
				<FixtureCase label="size">
					{(['sm', 'md', 'lg'] as const).map((size) => (
						<Card key={size} size={size}>
							<CardTitle>{size}</CardTitle>
						</Card>
					))}
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Card className="w-full">
						<CardHeader>
							<CardTitle>
								A card title that is long enough to wrap onto a second line at a narrow width
							</CardTitle>
							<CardDescription>
								A description that is also long enough to wrap onto more than one line in a narrow
								container and to fill the row in a wide one.
							</CardDescription>
						</CardHeader>
					</Card>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Group">
				<FixtureCase label="horizontal">
					<Group>
						<Button variant="outline">Cut</Button>
						<Button variant="outline">Copy</Button>
						<Button variant="outline">Paste</Button>
					</Group>
				</FixtureCase>
				<FixtureCase label="vertical">
					<Group orientation="vertical">
						<Button variant="outline">Cut</Button>
						<Button variant="outline">Copy</Button>
						<Button variant="outline">Paste</Button>
					</Group>
				</FixtureCase>
				<FixtureCase label="inputs">
					<Group>
						<Input placeholder="First" aria-label="First" />
						<Input placeholder="Last" aria-label="Last" />
					</Group>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Divider">
				<FixtureCase label="horizontal">
					<div className="flex h-12 w-48 items-center">
						<Divider />
					</div>
				</FixtureCase>
				<FixtureCase label="soft">
					<div className="flex h-12 w-48 items-center">
						<Divider soft />
					</div>
				</FixtureCase>
				<FixtureCase label="vertical">
					<div className="flex h-12 w-48 items-center justify-center">
						<Divider orientation="vertical" />
					</div>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Aspect ratio">
				{(['square', 'video', '4/3'] as const).map((ratio) => (
					<FixtureCase key={ratio} label={ratio}>
						<Card className="w-40 p-0">
							<AspectRatio ratio={ratio} className="flex items-center justify-center">
								{ratio}
							</AspectRatio>
						</Card>
					</FixtureCase>
				))}
				<FixtureCase label="custom ratio, full width" wide>
					<Card className="w-full p-0">
						<AspectRatio ratio={4} className="flex items-center justify-center">
							4
						</AspectRatio>
					</Card>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Collapse">
				<FixtureCase label="closed">
					<Collapse>
						<CollapseTrigger>Show details</CollapseTrigger>
						<CollapsePanel>
							<Text tone="muted">Hidden content.</Text>
						</CollapsePanel>
					</Collapse>
				</FixtureCase>
				<FixtureCase label="default open">
					<Collapse defaultOpen>
						<CollapseTrigger>Hide details</CollapseTrigger>
						<CollapsePanel>
							<Text tone="muted">This content is visible because the collapse starts open.</Text>
						</CollapsePanel>
					</Collapse>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Accordion">
				{ACCORDION_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						<Accordion variant={variant} defaultValue="shipping" className="w-full">
							{ACCORDION_ITEMS.map((item) => (
								<AccordionItem
									key={item.value}
									value={item.value}
									disabled={item.value === 'support'}
								>
									<AccordionTrigger>{item.title}</AccordionTrigger>
									<AccordionPanel>{item.body}</AccordionPanel>
								</AccordionItem>
							))}
						</Accordion>
					</FixtureCase>
				))}
				<FixtureCase label="long content, full width" wide>
					<Accordion defaultValue="long" className="w-full">
						<AccordionItem value="long">
							<AccordionTrigger>
								A trigger label that is long enough to wrap onto a second line at a narrow width
							</AccordionTrigger>
							<AccordionPanel>
								A panel body that is long enough to wrap onto more than one line in a narrow
								container and to fill the row in a wide one.
							</AccordionPanel>
						</AccordionItem>
					</Accordion>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Scroll area">
				<FixtureCase label="vertical, overflow">
					<ScrollArea extent="sm" rounded scrollbar="visible" className="w-full">
						<Stack gap="md" className="p-3">
							{PARAGRAPHS.map((paragraph) => (
								<Text key={paragraph}>{paragraph}</Text>
							))}
						</Stack>
					</ScrollArea>
				</FixtureCase>
				<FixtureCase label="horizontal, overflow">
					<ScrollArea orientation="horizontal" rounded scrollbar="visible" className="w-full">
						<Flex gap="sm" className="w-max p-3">
							{TAGS.map((tag) => (
								<Block key={tag}>{tag}</Block>
							))}
						</Flex>
					</ScrollArea>
				</FixtureCase>
				<FixtureCase label="bare">
					<ScrollArea bare extent="sm" className="w-full">
						<Stack gap="md">
							{PARAGRAPHS.map((paragraph) => (
								<Text key={paragraph}>{paragraph}</Text>
							))}
						</Stack>
					</ScrollArea>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Heading">
				<FixtureCase label="level">
					<Stack gap="sm">
						{HEADING_LEVELS.map((level) => (
							<Heading key={level} level={level}>
								Heading {level}
							</Heading>
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Heading level={2}>
						A heading that is long enough to wrap onto a second line at a narrow width
					</Heading>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Text">
				<FixtureCase label="tone">
					<Stack gap="xs">
						{TEXT_TONES.map((tone) => (
							<Text key={tone} tone={tone}>
								{tone}
							</Text>
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="color">
					<Stack gap="xs">
						{TEXT_COLORS.map((color) => (
							<Text key={color} color={color}>
								{color}
							</Text>
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="size">
					<Stack gap="xs">
						{TEXT_SIZES.map((size) => (
							<Text key={size} size={size}>
								{size}
							</Text>
						))}
					</Stack>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Text>
						A paragraph that is long enough to wrap onto more than one line in a narrow container
						and to fill the row in a wide one. The quick brown fox jumps over the lazy dog.
					</Text>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Icon">
				<FixtureCase label="default">
					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				</FixtureCase>
				<FixtureCase label="size">
					{ICON_SIZES.map((size) => (
						<Icon key={size} icon={<Plus />} size={size} />
					))}
					<Icon icon={<Plus />} size={32} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Markdown">
				<FixtureCase label="prose, full width" wide>
					<Markdown>{MARKDOWN}</Markdown>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Structure">
				<FixtureCase label="box">
					<Box p="md" bg="surface" outline radius="lg">
						Surface
					</Box>
					<Box p="md" bg="tint" radius="lg">
						Tint
					</Box>
					<Box p="md" outline="strong" radius="lg">
						Strong outline
					</Box>
				</FixtureCase>
				<FixtureCase label="flex">
					<Flex gap="sm" align="center" className="w-full">
						<Block>One</Block>
						<Block color="green">Two</Block>
						<Block color="amber">Three</Block>
					</Flex>
				</FixtureCase>
				<FixtureCase label="flex, justify between">
					<Flex gap="sm" justify="between" className="w-full">
						<Block>Start</Block>
						<Block color="rose">End</Block>
					</Flex>
				</FixtureCase>
				<FixtureCase label="stack">
					<Stack gap="sm" className="w-full">
						<Block>One</Block>
						<Block color="green">Two</Block>
						<Block color="amber">Three</Block>
					</Stack>
				</FixtureCase>
				<FixtureCase label="spacer">
					<Flex gap="sm" className="w-full">
						<Block>Left</Block>
						<Spacer />
						<Block color="rose">Right</Block>
					</Flex>
				</FixtureCase>
				<FixtureCase label="split, vertical">
					<Split orientation="vertical" ratio="1/4" className="h-40 w-full">
						<Block>Header</Block>
						<Block color="green">Body</Block>
					</Split>
				</FixtureCase>
				<FixtureCase label="split 1/2, full width" wide>
					<Split className="w-full">
						<Block>Left</Block>
						<Block color="green">Right</Block>
					</Split>
				</FixtureCase>
				<FixtureCase label="split 1/3, full width" wide>
					<Split ratio="1/3" className="w-full">
						<Block>Sidebar</Block>
						<Block color="amber">Main content</Block>
					</Split>
				</FixtureCase>
				<FixtureCase label="container, full width" wide>
					<div className="w-full bg-zinc-500/10">
						<Container size="sm" padding="md">
							<Block>Container content, sm</Block>
						</Container>
					</div>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}

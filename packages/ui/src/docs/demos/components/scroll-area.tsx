import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/card'
import { ScrollArea } from '../../../components/scroll-area'
import { Text } from '../../../components/text'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example, SizeListbox } from '../../engine'

const sizes = ['sm', 'md', 'lg', 'xl', '2xl'] as const

type Size = (typeof sizes)[number]

const paragraphs = Array.from({ length: 12 }, (_, i) => ({
	id: `para-${i}`,
	text: `Paragraph ${i + 1}. The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs.`,
}))

// A grid that overflows the frame on both axes.
const cells = Array.from({ length: 48 }, (_, i) => `Item ${i + 1}`)

const tags = [
	'react',
	'typescript',
	'tailwind',
	'motion',
	'vite',
	'biome',
	'pnpm',
	'turborepo',
	'lucide',
	'clsx',
	'floating-ui',
	'shiki',
]

export function Demo() {
	const [verticalSize, setVerticalSize] = useState<Size>('md')
	const [horizontalSize, setHorizontalSize] = useState<Size>('md')

	return (
		<>
			<Axes
				of="ScrollArea"
				omit={['extent']}
				render={(props) => (
					<ScrollArea {...props} extent="sm" className="max-w-96">
						<div className="grid w-max grid-cols-8 gap-2">
							{cells.map((cell) => (
								<Badge key={cell}>{cell}</Badge>
							))}
						</div>
					</ScrollArea>
				)}
			/>

			<Example
				title="Vertical with extent"
				actions={<SizeListbox sizes={sizes} value={verticalSize} onValueChange={setVerticalSize} />}
			>
				<ScrollArea extent={verticalSize} rounded className="max-w-96">
					<Stack gap="lg">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</Stack>
				</ScrollArea>
			</Example>

			<Example
				title="Horizontal with extent"
				actions={
					<SizeListbox sizes={sizes} value={horizontalSize} onValueChange={setHorizontalSize} />
				}
			>
				<ScrollArea orientation="horizontal" extent={horizontalSize} rounded>
					<Flex gap="sm" className="w-max">
						{tags.map((tag) => (
							<Badge key={tag}>{tag}</Badge>
						))}
					</Flex>
				</ScrollArea>
			</Example>

			<Example title="Bare (nested in a container)">
				<Card bg="none" className="max-w-96">
					<CardHeader>
						<CardTitle>Paragraphs</CardTitle>
					</CardHeader>
					<CardBody>
						<ScrollArea bare extent="md">
							<Stack gap="lg">
								{paragraphs.map((p) => (
									<Text key={p.id}>{p.text}</Text>
								))}
							</Stack>
						</ScrollArea>
					</CardBody>
				</Card>
			</Example>
		</>
	)
}

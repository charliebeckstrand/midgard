'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { Flex } from '../../components/flex'
import { ScrollArea } from '../../components/scroll-area'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'

export const meta = { category: 'Layout' }

const sizes = ['sm', 'md', 'lg', 'xl', '2xl'] as const

type Size = (typeof sizes)[number]

const paragraphs = Array.from({ length: 12 }, (_, i) => ({
	id: `para-${i}`,
	text: `Paragraph ${i + 1}. The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs.`,
}))

const tags = [
	'react',
	'typescript',
	'tailwind',
	'motion',
	'vite',
	'biome',
	'pnpm',
	'turborepo',
	'cva',
	'lucide',
	'clsx',
	'zustand',
	'floating-ui',
	'shiki',
]

export default function ScrollAreaDemo() {
	const [verticalSize, setVerticalSize] = useState<Size>('md')
	const [horizontalSize, setHorizontalSize] = useState<Size>('md')
	const [bothSize, setBothSize] = useState<Size>('md')

	return (
		<Stack gap={6}>
			<Example
				title="Vertical with size"
				actions={<SizeListbox sizes={sizes} value={verticalSize} onChange={setVerticalSize} />}
			>
				<ScrollArea size={verticalSize} rounded className="max-w-96">
					<Stack gap={4}>
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</Stack>
				</ScrollArea>
			</Example>

			<Example
				title="Horizontal with size"
				actions={<SizeListbox sizes={sizes} value={horizontalSize} onChange={setHorizontalSize} />}
			>
				<ScrollArea orientation="horizontal" size={horizontalSize} rounded>
					<Flex gap={2} className="w-max">
						{tags.map((tag) => (
							<Badge key={tag}>{tag}</Badge>
						))}
					</Flex>
				</ScrollArea>
			</Example>

			<Example
				title="Both axes"
				actions={<SizeListbox sizes={sizes} value={bothSize} onChange={setBothSize} />}
			>
				<ScrollArea orientation="both" size={bothSize} rounded>
					<Stack gap={4} className="w-max">
						{paragraphs.map((p) => (
							<Text key={p.id} className="whitespace-nowrap">
								{p.text}
							</Text>
						))}
					</Stack>
				</ScrollArea>
			</Example>

			<Example title="Hidden scrollbar">
				<ScrollArea size="md" scrollbar="hidden" rounded className="max-w-96">
					<Stack gap={4}>
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</Stack>
				</ScrollArea>
			</Example>

			<Example title="Visible scrollbar">
				<ScrollArea size="md" scrollbar="visible" rounded className="max-w-96">
					<Stack gap={4}>
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</Stack>
				</ScrollArea>
			</Example>

			<Example title="Bare (nested in a container)">
				<Card bg="none" className="max-w-96">
					<CardHeader>
						<CardTitle>Paragraphs</CardTitle>
					</CardHeader>
					<CardBody>
						<ScrollArea bare size="md">
							<Stack gap={4}>
								{paragraphs.map((p) => (
									<Text key={p.id}>{p.text}</Text>
								))}
							</Stack>
						</ScrollArea>
					</CardBody>
				</Card>
			</Example>
		</Stack>
	)
}

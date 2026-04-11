'use client'

import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Badge } from '../../components/badge'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { Kbd } from '../../components/kbd'
import { ScrollArea } from '../../components/scroll-area'
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
		<div className="space-y-8">
			<Alert type="warning" closable>
				<Text>
					<code>ScrollArea</code> intercepts scroll events — hold{' '}
					<Kbd className="mx-0.5">Shift</Kbd> while scrolling to scroll the page instead.
				</Text>
			</Alert>

			<Example
				title="Vertical with size"
				actions={<SizeListbox sizes={sizes} value={verticalSize} onChange={setVerticalSize} />}
			>
				<ScrollArea size={verticalSize} rounded className="max-w-96">
					<div className="space-y-3">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example
				title="Horizontal with size"
				actions={<SizeListbox sizes={sizes} value={horizontalSize} onChange={setHorizontalSize} />}
			>
				<ScrollArea orientation="horizontal" size={horizontalSize} rounded>
					<div className="flex w-max gap-2">
						{tags.map((tag) => (
							<Badge key={tag}>{tag}</Badge>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example
				title="Both axes"
				actions={<SizeListbox sizes={sizes} value={bothSize} onChange={setBothSize} />}
			>
				<ScrollArea orientation="both" size={bothSize} rounded>
					<div className="w-max space-y-3">
						{paragraphs.map((p) => (
							<Text key={p.id} className="whitespace-nowrap">
								{p.text}
							</Text>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example title="Hidden scrollbar">
				<ScrollArea size="md" scrollbar="hidden" rounded className="max-w-96">
					<div className="space-y-3">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example title="Visible scrollbar">
				<ScrollArea size="md" scrollbar="visible" rounded className="max-w-96">
					<div className="space-y-3">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example title="Bare (nested in a container)">
				<Card variant="outline" className="max-w-96">
					<CardHeader>
						<CardTitle>Paragraphs</CardTitle>
					</CardHeader>
					<CardBody>
						<ScrollArea bare size="md">
							<div className="space-y-3">
								{paragraphs.map((p) => (
									<Text key={p.id}>{p.text}</Text>
								))}
							</div>
						</ScrollArea>
					</CardBody>
				</Card>
			</Example>
		</div>
	)
}

import { ScrollArea } from '../../components/scroll-area'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Layout' }

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
	return (
		<div className="space-y-8">
			<Example
				title="Vertical"
				code={code`
					import { ScrollArea } from 'ui/scroll-area'

					<ScrollArea className="h-48 rounded-lg border p-4">
						<div className="space-y-3">...</div>
					</ScrollArea>
				`}
			>
				<ScrollArea className="h-48 max-w-md rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
					<div className="space-y-3">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example
				title="Horizontal"
				code={code`
					import { ScrollArea } from 'ui/scroll-area'

					<ScrollArea orientation="horizontal" className="rounded-lg border">
						<div className="flex w-max gap-2 p-3">...</div>
					</ScrollArea>
				`}
			>
				<ScrollArea
					orientation="horizontal"
					className="max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800"
				>
					<div className="flex w-max gap-2 p-3">
						{tags.map((tag) => (
							<span
								key={tag}
								className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
							>
								{tag}
							</span>
						))}
					</div>
				</ScrollArea>
			</Example>

			<Example
				title="Both axes"
				code={code`
					import { ScrollArea } from 'ui/scroll-area'

					<ScrollArea orientation="both" className="h-64 rounded-lg border">
						<div className="w-[800px] p-4">...</div>
					</ScrollArea>
				`}
			>
				<ScrollArea
					orientation="both"
					className="h-64 max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800"
				>
					<div className="w-[800px] space-y-3 p-4">
						{paragraphs.map((p) => (
							<Text key={p.id}>{p.text}</Text>
						))}
					</div>
				</ScrollArea>
			</Example>
		</div>
	)
}

import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { ScrollArea } from 'ui/scroll-area'

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

export default function HorizontalWithExtent() {
	return (
		<ScrollArea orientation="horizontal" extent="md" rounded>
			<Flex gap="sm" className="w-max">
				{tags.map((tag) => (
					<Badge key={tag}>{tag}</Badge>
				))}
			</Flex>
		</ScrollArea>
	)
}

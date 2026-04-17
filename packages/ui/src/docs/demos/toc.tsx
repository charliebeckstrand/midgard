'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Toc, type TocItem } from '../../components/toc'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const items: TocItem[] = [
	{ id: 'intro', label: 'Introduction', level: 2 },
	{ id: 'install', label: 'Installation', level: 2 },
	{ id: 'usage', label: 'Usage', level: 2 },
	{ id: 'props', label: 'Props', level: 3 },
	{ id: 'events', label: 'Events', level: 3 },
	{ id: 'advanced', label: 'Advanced patterns', level: 3 },
	{ id: 'api', label: 'API reference', level: 2 },
]

export default function TocDemo() {
	const [activeId, setActiveId] = useState('usage')

	return (
		<Stack gap={6}>
			<Example title="Default">
				<div className="max-w-xs">
					<Toc items={items} activeId={activeId} onActiveChange={setActiveId} />
				</div>
			</Example>

			<Example title="Interactive">
				<Stack gap={3}>
					<Flex gap={2} wrap>
						{items.map((i) => (
							<Button key={i.id} variant="outline" size="sm" onClick={() => setActiveId(i.id)}>
								{i.label}
							</Button>
						))}
					</Flex>
					<div className="max-w-xs">
						<Toc items={items} activeId={activeId} />
					</div>
				</Stack>
			</Example>

			<Example title="Single level">
				<div className="max-w-xs">
					<Toc items={items.filter((i) => i.level === 2)} activeId="install" />
				</div>
			</Example>

			<Example title="Auto scroll-spy">
				<Text color="muted">
					When used without <code>items</code>, <code>Toc</code> scans its <code>container</code>{' '}
					(or the document) for headings with ids and highlights the one closest to the top of the
					viewport as the page scrolls.
				</Text>
			</Example>
		</Stack>
	)
}

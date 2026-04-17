'use client'

import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
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

function DefaultExample() {
	const [activeId, setActiveId] = useState('usage')

	return (
		<Example title="Default">
			<Toc items={items} activeId={activeId} onActiveChange={setActiveId} />
		</Example>
	)
}

function InteractiveExample() {
	const [activeId, setActiveId] = useState('usage')

	return (
		<Example title="Interactive">
			<Stack gap={4}>
				<Flex gap={2} wrap>
					{items.map((i) => (
						<Button key={i.id} variant="outline" size="sm" onClick={() => setActiveId(i.id)}>
							{i.label}
						</Button>
					))}
				</Flex>
				<Toc items={items} activeId={activeId} />
			</Stack>
		</Example>
	)
}

function SingleLevelExample() {
	const [activeId, setActiveId] = useState('install')

	return (
		<Example title="Single level">
			<Toc
				items={items.filter((i) => i.level === 2)}
				activeId={activeId}
				onActiveChange={setActiveId}
			/>
		</Example>
	)
}

export default function TocDemo() {
	return (
		<Stack gap={6}>
			<Alert type="info" closable>
				When used without items, Toc scans its container (or the document) for headings with ids and
				highlights the one closest to the top of the viewport as the page scrolls.
			</Alert>

			<DefaultExample />
			<InteractiveExample />
			<SingleLevelExample />
		</Stack>
	)
}

'use client'

import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Stack } from '../../components/stack'
import { Toc, type TocItem } from '../../components/toc'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

const items: TocItem[] = [
	{ id: 'intro', label: 'Introduction', level: 1 },
	{ id: 'install', label: 'Installation', level: 1 },
	{ id: 'usage', label: 'Usage', level: 1 },
	{ id: 'props', label: 'Props', level: 2 },
	{ id: 'events', label: 'Events', level: 2 },
	{ id: 'advanced', label: 'Advanced patterns', level: 2 },
	{ id: 'api', label: 'API reference', level: 1 },
]

function DefaultExample() {
	const [activeId, setActiveId] = useState('usage')

	return (
		<Example title="Default">
			<Toc items={items} activeId={activeId} onActiveChange={setActiveId} />
		</Example>
	)
}

function SingleLevelExample() {
	const [activeId, setActiveId] = useState('install')

	return (
		<Example title="Single level">
			<Toc
				items={items.filter((i) => i.level === 1)}
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
			<SingleLevelExample />
		</Stack>
	)
}

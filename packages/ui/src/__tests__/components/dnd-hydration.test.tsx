import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { List, ListItem } from '../../components/list'
import { act, attach } from '../helpers'

type Item = { id: string; label: string }

const items: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
]

const columns = [{ id: 'todo', title: 'Todo', items }]

/** The `aria-describedby` values in server markup, in document order. */
function describedByIds(html: string): string[] {
	return [...html.matchAll(/aria-describedby="([^"]*)"/g)].map((match) => match[1] ?? '')
}

/**
 * Renders `element` to server markup two times in one process, as a server that
 * stays up does. Then it hydrates the second markup.
 *
 * @returns The two server markups and two spies. A mismatch reaches
 * `onRecoverableError`, and React logs an attribute mismatch to `consoleError`.
 */
function hydrateAfterTwoServerRenders(element: ReactElement) {
	const first = renderToString(element)

	const second = renderToString(element)

	const container = attach(document.createElement('div'))

	container.innerHTML = second

	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element, { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

	return { first, second, container, onRecoverableError, consoleError }
}

describe.each([
	[
		'Kanban',
		<Kanban
			key="kanban"
			columns={columns}
			getKey={(item: Item) => item.id}
			onReorder={() => {}}
			aria-label="Board"
		>
			<KanbanColumn value="todo" aria-label="Todo">
				<KanbanColumnBody>
					{items.map((item) => (
						<KanbanCard key={item.id} value={item.id}>
							<KanbanCardHandle />
							{item.label}
						</KanbanCard>
					))}
				</KanbanColumnBody>
			</KanbanColumn>
		</Kanban>,
	],
	[
		'sortable List',
		<List key="list" items={items} getKey={(item) => item.id} onReorder={() => {}}>
			{(item) => <ListItem>{item.label}</ListItem>}
		</List>,
	],
])('%s drag description id across server renders', (_name, element) => {
	it('gives each server render the same id, and the client hydrates it with no mismatch', () => {
		const { first, second, container, onRecoverableError, consoleError } =
			hydrateAfterTwoServerRenders(element)

		const ids = describedByIds(second)

		expect(ids.length).toBeGreaterThan(0)

		expect(describedByIds(first)).toEqual(ids)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		const hydrated = [...container.querySelectorAll('[aria-describedby]')].map((node) =>
			node.getAttribute('aria-describedby'),
		)

		expect(hydrated).toEqual(ids)
	})
})

import { renderHook } from '@testing-library/react'
import { useDragControls } from 'motion/react'
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { List, ListItem } from '../../components/list'
import { createGroup, QueryBuilder, type QueryField } from '../../modules/query'
import { allBySlot, fireEvent, renderUI } from '../helpers'

// A reorder grip starts a Motion drag from its press. Motion refuses a press that is not the
// primary button, but a macOS Ctrl-click sends `button === 0` with `ctrlKey`. The context menu
// that it opens can take the release, so the drag stays live with no pointer down. Each grip
// must start a drag only from a primary press (`isPrimaryPress`).

// The jsdom mock gives each caller the same controls. The run restores each spy before a test.
let start: MockInstance

beforeEach(() => {
	start = vi.spyOn(renderHook(useDragControls).result.current, 'start')
})

const items = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
]

const fields: QueryField[] = [{ name: 'title', label: 'Title', type: 'text' }]

const rule = (id: string) =>
	({ id, type: 'rule', field: 'title', operator: 'contains', value: id }) as const

/** The grip of each surface, rendered with two items so that it shows. */
const grips = {
	List: () =>
		allBySlot(
			renderUI(
				<List items={items} getKey={(item) => item.id} onReorder={() => {}}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>,
			).container,
			'list-handle',
		)[0],
	QueryBuilder: () =>
		allBySlot(
			renderUI(
				<QueryBuilder
					fields={fields}
					value={{ ...createGroup('and', [rule('r1'), rule('r2')]), id: 'root' }}
					reorder
				/>,
			).container,
			'query-reorder-handle',
		)[0],
}

describe.each(Object.entries(grips))('%s reorder grip', (_, grip) => {
	it('starts a drag from a primary press', () => {
		fireEvent.pointerDown(grip() as Element, { button: 0, isPrimary: true })

		expect(start).toHaveBeenCalledTimes(1)
	})

	it('starts no drag from a Ctrl-click', () => {
		fireEvent.pointerDown(grip() as Element, { button: 0, ctrlKey: true, isPrimary: true })

		expect(start).not.toHaveBeenCalled()
	})

	it('starts no drag from a secondary button', () => {
		fireEvent.pointerDown(grip() as Element, { button: 2, isPrimary: true })

		expect(start).not.toHaveBeenCalled()
	})

	it('starts no drag from a pointer that is not primary', () => {
		fireEvent.pointerDown(grip() as Element, { button: 0, isPrimary: false })

		expect(start).not.toHaveBeenCalled()
	})
})

import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { JsonTreeBranchHeader } from '../../components/json-tree/json-tree-branch-header'
import { JsonTreeLeafRow } from '../../components/json-tree/json-tree-leaf-row'
import type { JsonValue } from '../../components/json-tree/types'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A toggle in a JsonTree renders only the rows whose open state changed.
 *
 * The controlled `expanded` set traveled in the tree context, and each node put
 * it in the context that it gives its children. A new set therefore rendered
 * each row. Each node now reads its own path from a store. The root context
 * also had a new identity on each render of the tree, so a parent render with
 * the same props rendered each row.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../components/json-tree/json-tree-branch-header', async (importActual) => {
	const actual =
		await importActual<typeof import('../../components/json-tree/json-tree-branch-header')>()

	return { ...actual, JsonTreeBranchHeader: vi.fn(actual.JsonTreeBranchHeader) }
})

vi.mock('../../components/json-tree/json-tree-leaf-row', async (importActual) => {
	const actual =
		await importActual<typeof import('../../components/json-tree/json-tree-leaf-row')>()

	return { ...actual, JsonTreeLeafRow: vi.fn(actual.JsonTreeLeafRow) }
})

/** Twenty items of ten leaves each, and one closed branch in each item. */
const DATA: JsonValue = Object.fromEntries(
	Array.from({ length: 20 }, (_, item) => [
		`item${item}`,
		{
			...Object.fromEntries(Array.from({ length: 10 }, (_, leaf) => [`leaf${leaf}`, leaf])),
			extra: { deep: 1 },
		},
	]),
)

/** The rows that rendered since the last clear. */
function rowRenders() {
	return (
		vi.mocked(JsonTreeBranchHeader).mock.calls.length + vi.mocked(JsonTreeLeafRow).mock.calls.length
	)
}

function clearRenders() {
	vi.mocked(JsonTreeBranchHeader).mockClear()

	vi.mocked(JsonTreeLeafRow).mockClear()
}

/** The toggle button of the `extra` branch of `item0`. */
function extraToggle() {
	return screen.getAllByRole('treeitem', { name: /extra/ })[0] as HTMLElement
}

function Controlled() {
	const [expanded, setExpanded] = useState(
		() => new Set(['$', ...Array.from({ length: 20 }, (_, item) => `$.item${item}`)]),
	)

	return <JsonTree data={DATA} expanded={expanded} onExpandedChange={setExpanded} />
}

describe('JsonTree row renders', () => {
	beforeEach(clearRenders)

	it('renders only the toggled branch and its new rows under control', () => {
		renderUI(<Controlled />)

		expect(rowRenders()).toBeGreaterThan(200)

		clearRenders()

		act(() => {
			fireEvent.click(extraToggle())
		})

		expect(extraToggle()).toHaveAttribute('aria-expanded', 'true')

		// The `extra` header, and the one leaf that it opens.
		expect(vi.mocked(JsonTreeBranchHeader)).toHaveBeenCalledTimes(1)

		expect(vi.mocked(JsonTreeLeafRow)).toHaveBeenCalledTimes(1)
	})

	it('renders no row for a parent render with the same props', () => {
		function Parent({ tick }: { tick: number }) {
			return (
				<div data-tick={tick}>
					<JsonTree data={DATA} defaultExpandDepth={2} />
				</div>
			)
		}

		const { rerender } = renderUI(<Parent tick={0} />)

		clearRenders()

		rerender(<Parent tick={1} />)

		expect(rowRenders()).toBe(0)
	})
})

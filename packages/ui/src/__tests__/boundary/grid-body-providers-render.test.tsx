import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

// The repository double of `@floating-ui/react` gives the providers of the
// context menu a new value on each render, which the real module does not.
vi.mock('@floating-ui/react', async (importOriginal) => importOriginal())

/**
 * A provider above the body must not change its value on a gesture. React 19
 * propagates a context change lazily: each memoized row that bails out walks
 * its subtree to look for a reader, and the body holds none. The walk is in
 * proportion to the mounted cells, and a render count does not show it, so this
 * suite reads the provider values themselves.
 */

/** The fiber fields that the suite reads. */
type Fiber = {
	tag: number
	type: unknown
	stateNode: unknown
	memoizedProps: { value?: unknown } | null
	return: Fiber | null
	child: Fiber | null
	sibling: Fiber | null
}

/** The tag of a context provider fiber in React 19. */
const CONTEXT_PROVIDER = 10

/** The tag of the root fiber. */
const HOST_ROOT = 3

/** The fiber in the current tree whose host node is `node`. */
function currentFiber(node: Element): Fiber {
	const key = Object.keys(node).find((name) => name.startsWith('__reactFiber$'))

	if (!key) throw new Error('The node has no fiber.')

	// The fiber on the node can be the alternate. The root holds the current tree.
	let root = (node as unknown as Record<string, Fiber>)[key] as Fiber

	while (root.tag !== HOST_ROOT && root.return) root = root.return

	const stack = [(root.stateNode as { current: Fiber }).current]

	while (stack.length > 0) {
		const fiber = stack.pop() as Fiber

		if (fiber.stateNode === node) return fiber

		if (fiber.sibling) stack.push(fiber.sibling)

		if (fiber.child) stack.push(fiber.child)
	}

	throw new Error('The node is not in the current tree.')
}

/** The value of each provider above `node`, from the node up to the root. */
function providersAbove(node: Element): { type: unknown; value: unknown }[] {
	const found: { type: unknown; value: unknown }[] = []

	for (let fiber = currentFiber(node).return; fiber; fiber = fiber.return) {
		if (fiber.tag === CONTEXT_PROVIDER)
			found.push({ type: fiber.type, value: fiber.memoizedProps?.value })
	}

	return found
}

/** The name of each provider above `node` whose value is not the value in `before`. */
function changedSince(node: Element, before: { type: unknown; value: unknown }[]): string[] {
	const after = providersAbove(node)

	expect(after.map(({ type }) => type)).toEqual(before.map(({ type }) => type))

	return after
		.filter(({ value }, index) => !Object.is(value, before[index]?.value))
		.map(({ type }) => (type as { displayName?: string }).displayName ?? 'Context')
}

type Row = { id: number; name: string; role: string }

const rows: Row[] = Array.from({ length: 20 }, (_, index) => ({
	id: index + 1,
	name: `Name ${index + 1}`,
	role: index % 2 ? 'Admin' : 'Viewer',
}))

const columns: GridColumn<Row>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', field: 'name', sortable: true },
	{ id: 'role', title: 'Role', field: 'role', sortable: true, filterable: true },
]

const getKey = (row: Row) => row.id

function mount() {
	const { container } = renderUI(
		<Grid
			columns={columns}
			rows={rows}
			getKey={getKey}
			navigable
			selection={{}}
			search={{}}
			columnFilters={{}}
		/>,
	)

	const body = container.querySelector('tbody')

	if (!body) throw new Error('The grid has no body.')

	return body
}

describe('Grid providers above the body', () => {
	it('keeps each value when a row toggle flips a selection flag', () => {
		const body = mount()

		const before = providersAbove(body)

		// The first selected row flips `someSelected` from false to true.
		fireEvent.click(screen.getAllByRole('checkbox', { name: /select row/i })[0] as HTMLElement)

		expect(screen.getAllByRole('checkbox', { name: /select row/i })[0]).toBeChecked()

		expect(changedSince(body, before)).toEqual([])
	})

	it('keeps each value when a header click sorts the rows', () => {
		const body = mount()

		const before = providersAbove(body)

		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

		expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
			'aria-sort',
			'ascending',
		)

		expect(changedSince(body, before)).toEqual([])
	})

	it('keeps each value when an arrow moves the cursor', () => {
		const body = mount()

		const grid = screen.getByRole('grid')

		fireEvent.focus(grid)

		const before = providersAbove(body)

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		expect(changedSince(body, before)).toEqual([])
	})
})

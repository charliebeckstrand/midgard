import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { JsonTree } from '../../components/json-tree'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

/**
 * Keyboard reach of the windowed JsonTree (real browser). jsdom renders no virtualized rows, so
 * it has no window edge. Here the tree windows 500 leaves, and the keys must reach the rows
 * that the window keeps out of the DOM.
 */

const LEAF_COUNT = 500

const DATA = { list: Array.from({ length: LEAF_COUNT }, (_, index) => `v${index}`) }

/**
 * A tree whose scroller holds about ten rows, with every branch open. Only `maxHeight` bounds
 * the scroller, unless `className` gives it a height of its own. With `button`, a button with
 * that name comes before the tree.
 */
function mountTree({ className, button }: { className?: string; button?: string } = {}) {
	renderUI(
		<>
			{button === undefined ? null : <button type="button">{button}</button>}
			<JsonTree
				data={DATA}
				rootKey="root"
				defaultExpandDepth={Number.POSITIVE_INFINITY}
				virtualize={{ maxHeight: '240px', overscan: 2 }}
				className={className}
			/>
		</>,
	)

	return present(screen.getByRole('tree'), 'the tree')
}

/** The mounted treeitems, in DOM order. */
const rows = (tree: HTMLElement) =>
	Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'))

/** The text of the focused element, or an empty string when focus is outside a treeitem. */
function focusedLabel() {
	const active = document.activeElement

	return active instanceof HTMLElement && active.matches('[role="treeitem"]')
		? (active.textContent ?? '')
		: ''
}

/** Whether the row for leaf `index + 1` is mounted. */
const rowIndexAfter = (tree: HTMLElement, index: number) =>
	rows(tree).some((row) => new RegExp(`v${index + 1}\\b`).test(row.textContent ?? ''))

/** Mounts the tree, waits for the window, and focuses the root row. */
const mountAndFocusRoot = vi.defineHelper(async () => {
	const tree = mountTree()

	await waitFor(() => expect(rows(tree).length).toBeGreaterThan(0))

	expect(rows(tree).length).toBeLessThan(LEAF_COUNT)

	present(rows(tree)[0], 'the root row').focus()

	expect(focusedLabel()).toContain('root')

	return tree
})

describe('JsonTree under virtualize: keyboard reach past the window', () => {
	it('End focuses the last leaf of the flat list, and Home returns to the root', async () => {
		await mountAndFocusRoot()

		await userEvent.keyboard('{End}')

		await waitFor(() => expect(focusedLabel()).toMatch(/v499\b/))

		await userEvent.keyboard('{Home}')

		await waitFor(() => expect(focusedLabel()).toContain('root'))
	})

	it('ArrowUp on the root wraps to the last leaf', async () => {
		await mountAndFocusRoot()

		await userEvent.keyboard('{ArrowUp}')

		await waitFor(() => expect(focusedLabel()).toMatch(/v499\b/))
	})

	it('ArrowDown on the last mounted row focuses the next row of the flat list', async () => {
		const tree = await mountAndFocusRoot()

		const last = present(rows(tree).at(-1), 'the last mounted row')

		const index = Number(/v(\d+)/.exec(last.textContent ?? '')?.[1])

		// A plain focus scrolls the row into view and moves the window. Hold the window still.
		last.focus({ preventScroll: true })

		expect(rowIndexAfter(tree, index)).toBe(false)

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(focusedLabel()).toMatch(new RegExp(`v${index + 1}\\b`)))
	})
})

/** The mounted row of leaf `index`, or undefined when the window keeps it out of the DOM. */
const leafRow = (tree: HTMLElement, index: number) =>
	rows(tree).find((row) => new RegExp(`v${index}\\b`).test(row.textContent ?? ''))

/** A scroll offset that puts the first rows far past the overscan. */
const FAR = 4000

/**
 * Mounts a button and the tree, focuses the row of leaf 3, and scrolls the tree by `FAR`. The
 * focused row unmounts.
 */
const focusLeafAndScrollAway = vi.defineHelper(async () => {
	const tree = mountTree({ button: 'Outside' })

	await waitFor(() => expect(leafRow(tree, 3)).toBeDefined())

	present(leafRow(tree, 3), 'the row of leaf 3').focus()

	expect(focusedLabel()).toMatch(/v3\b/)

	tree.scrollTop = FAR

	await waitFor(() => expect(leafRow(tree, 3)).toBeUndefined())

	return tree
})

describe('JsonTree under virtualize: a focused row that scrolls out of the window', () => {
	it('keeps focus in the tree, and ArrowDown focuses the next row', async () => {
		const tree = await focusLeafAndScrollAway()

		expect(document.activeElement).toBe(tree)

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(focusedLabel()).toMatch(/v4\b/))
	})

	it('moves Home from the parked focus to the root', async () => {
		await focusLeafAndScrollAway()

		await userEvent.keyboard('{Home}')

		await waitFor(() => expect(focusedLabel()).toContain('root'))
	})

	it('focuses the row again when it scrolls back into the window', async () => {
		const tree = await focusLeafAndScrollAway()

		expect(document.activeElement).toBe(tree)

		tree.scrollTop = 0

		await waitFor(() => expect(focusedLabel()).toMatch(/v3\b/))
	})

	it('leaves focus on a control outside the tree', async () => {
		const tree = await focusLeafAndScrollAway()

		await waitFor(() => expect(document.activeElement).toBe(tree))

		const outside = screen.getByRole('button', { name: 'Outside' })

		outside.focus()

		tree.scrollTop = 0

		await waitFor(() => expect(leafRow(tree, 3)).toBeDefined())

		expect(document.activeElement).toBe(outside)
	})
})

// A chord such as Alt+ArrowLeft (history back) is for the browser. The keys go as dispatched
// events, so a chord that the browser takes does not move this page.
describe('JsonTree under virtualize: browser chords', () => {
	it.each([
		['Alt+ArrowUp', 'ArrowUp', { altKey: true }],
		['Ctrl+End', 'End', { ctrlKey: true }],
		['Cmd+ArrowUp', 'ArrowUp', { metaKey: true }],
	])('leaves %s on the root row to the browser', async (_name, key, modifier) => {
		const tree = await mountAndFocusRoot()

		const root = present(rows(tree)[0], 'the root row')

		const proceeded = fireEvent.keyDown(root, { key, ...modifier })

		expect(proceeded).toBe(true)

		expect(document.activeElement).toBe(root)
	})

	it('leaves Alt+ArrowDown on the parked focus to the browser', async () => {
		const tree = await focusLeafAndScrollAway()

		expect(document.activeElement).toBe(tree)

		const proceeded = fireEvent.keyDown(tree, { key: 'ArrowDown', altKey: true })

		expect(proceeded).toBe(true)

		expect(document.activeElement).toBe(tree)
	})
})

describe('JsonTree under virtualize: the Tab stop', () => {
	it('puts the Tab stop on a row in view after a scroll past the overscan', async () => {
		const tree = mountTree({ button: 'Before' })

		await waitFor(() => expect(rows(tree).length).toBeGreaterThan(1))

		const [root, next] = rows(tree)

		const rootTop = present(root, 'the root row').getBoundingClientRect().top

		const pitch = present(next, 'the second row').getBoundingClientRect().top - rootTop

		// Twenty rows down, far past the two rows of overscan. The top edge of a row meets the top
		// of the viewport, so the first row in view shows in full. A row that the viewport cuts
		// scrolls a small distance when it gets focus.
		tree.scrollTop = rootTop - tree.getBoundingClientRect().top - tree.clientTop + 20 * pitch

		await waitFor(() => expect(leafRow(tree, 3)).toBeUndefined())

		const scrollTop = tree.scrollTop

		screen.getByRole('button', { name: 'Before' }).focus()

		await userEvent.keyboard('{Tab}')

		const active = document.activeElement

		expect(active instanceof HTMLElement && tree.contains(active)).toBe(true)

		const view = tree.getBoundingClientRect()

		const row = present(active, 'the focused row').getBoundingClientRect()

		expect(row.top).toBeGreaterThanOrEqual(view.top)

		expect(row.bottom).toBeLessThanOrEqual(view.bottom)

		expect(tree.scrollTop).toBe(scrollTop)
	})
})

describe('JsonTree under virtualize: the horizontal arrows', () => {
	it('ArrowLeft on a leaf past the window focuses its parent branch', async () => {
		const tree = await mountAndFocusRoot()

		await userEvent.keyboard('{End}')

		await waitFor(() => expect(focusedLabel()).toMatch(/v499\b/))

		// The `list` branch scrolled out of the window with the root.
		expect(rows(tree).some((row) => row.getAttribute('aria-level') === '2')).toBe(false)

		await userEvent.keyboard('{ArrowLeft}')

		await waitFor(() => expect(document.activeElement).toHaveAttribute('aria-level', '2'))

		expect(focusedLabel()).toContain('list')

		// An open branch: ArrowLeft closes it, then ArrowLeft moves to the root.
		await userEvent.keyboard('{ArrowLeft}')

		await waitFor(() => expect(document.activeElement).toHaveAttribute('aria-expanded', 'false'))

		await userEvent.keyboard('{ArrowLeft}')

		await waitFor(() => expect(focusedLabel()).toContain('root'))

		// The root is open: ArrowRight moves to its first child.
		await userEvent.keyboard('{ArrowRight}')

		await waitFor(() => expect(focusedLabel()).toContain('list'))
	})
})

describe('JsonTree under virtualize: the scroller', () => {
	it.each([
		['only maxHeight', undefined],
		['a fixed height', 'h-60'],
	])('renders rows and scrolls to the last node under %s', async (_, className) => {
		const tree = mountTree({ className })

		await waitFor(() => expect(rows(tree).length).toBeGreaterThan(0))

		// The scroller stops at its cap, and the spacers hold the height of every row.
		expect(tree.getBoundingClientRect().height).toBeCloseTo(240, 0)

		expect(tree.scrollHeight).toBeGreaterThan(LEAF_COUNT * 20)

		tree.scrollTop = tree.scrollHeight

		await waitFor(() => expect(rowIndexAfter(tree, LEAF_COUNT - 2)).toBe(true))

		expect(tree.scrollTop + tree.clientHeight).toBeCloseTo(tree.scrollHeight, 0)
	})
})

describe('JsonTree under virtualize: collapsible', () => {
	it('keeps a fixed branch open, and ArrowLeft moves from it to its parent', async () => {
		renderUI(
			<JsonTree
				data={{ outer: { inner: 1 } }}
				collapsible="root"
				defaultExpandDepth={0}
				virtualize={{ maxHeight: '240px' }}
			/>,
		)

		const tree = present(screen.getByRole('tree'), 'the tree')

		const root = present(screen.getByRole('treeitem', { expanded: false }), 'the root row')

		await userEvent.click(root)

		await waitFor(() =>
			expect(rows(tree).some((row) => /"inner"/.test(row.textContent ?? ''))).toBe(true),
		)

		const outer = present(
			rows(tree).find((row) => /"outer"/.test(row.textContent ?? '')),
			'the outer row',
		)

		expect(outer).not.toHaveAttribute('aria-expanded')

		outer.focus()

		await userEvent.keyboard('{ArrowLeft}')

		await waitFor(() => expect(document.activeElement).toBe(rows(tree)[0]))
	})

	it('moves ArrowRight from a fixed branch to its first child', async () => {
		renderUI(
			<JsonTree
				data={{ outer: { inner: 1 } }}
				collapsible={false}
				virtualize={{ maxHeight: '240px' }}
			/>,
		)

		const tree = present(screen.getByRole('tree'), 'the tree')

		await waitFor(() =>
			expect(rows(tree).some((row) => /"inner"/.test(row.textContent ?? ''))).toBe(true),
		)

		present(rows(tree)[0], 'the root row').focus()

		await userEvent.keyboard('{ArrowRight}')

		await waitFor(() => expect(focusedLabel()).toMatch(/"outer"/))

		await userEvent.keyboard('{ArrowRight}')

		await waitFor(() => expect(focusedLabel()).toMatch(/"inner"/))
	})
})

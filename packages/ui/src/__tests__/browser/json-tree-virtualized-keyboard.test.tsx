import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { JsonTree } from '../../components/json-tree'
import { present, renderUI, screen, waitFor } from '../helpers'

/**
 * Keyboard reach of the windowed JsonTree (real browser). jsdom renders no virtualized rows, so
 * it has no window edge. Here the tree windows 500 leaves, and the keys must reach the rows
 * that the window keeps out of the DOM.
 */

const LEAF_COUNT = 500

const DATA = { list: Array.from({ length: LEAF_COUNT }, (_, i) => `v${i}`) }

/**
 * A tree whose scroller holds about ten rows, with every branch open. Only `maxHeight` bounds
 * the scroller, unless `className` gives it a height of its own.
 */
function mountTree(className?: string) {
	renderUI(
		<JsonTree
			data={DATA}
			rootKey="root"
			defaultExpandDepth={Number.POSITIVE_INFINITY}
			virtualize={{ maxHeight: '240px', overscan: 2 }}
			className={className}
		/>,
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
async function mountAndFocusRoot() {
	const tree = mountTree()

	await waitFor(() => expect(rows(tree).length).toBeGreaterThan(0))

	expect(rows(tree).length).toBeLessThan(LEAF_COUNT)

	present(rows(tree)[0], 'the root row').focus()

	expect(focusedLabel()).toContain('root')

	return tree
}

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

describe('JsonTree under virtualize: the scroller', () => {
	it.each([
		['only maxHeight', undefined],
		['a fixed height', 'h-60'],
	])('renders rows and scrolls to the last node under %s', async (_, className) => {
		const tree = mountTree(className)

		await waitFor(() => expect(rows(tree).length).toBeGreaterThan(0))

		// The scroller stops at its cap, and the spacers hold the height of every row.
		expect(tree.getBoundingClientRect().height).toBeCloseTo(240, 0)

		expect(tree.scrollHeight).toBeGreaterThan(LEAF_COUNT * 20)

		tree.scrollTop = tree.scrollHeight

		await waitFor(() => expect(rowIndexAfter(tree, LEAF_COUNT - 2)).toBe(true))

		expect(tree.scrollTop + tree.clientHeight).toBeCloseTo(tree.scrollHeight, 0)
	})
})

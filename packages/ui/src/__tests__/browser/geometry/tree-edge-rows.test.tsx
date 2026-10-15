import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Tree, TreeItem, TreeSkeleton } from '../../../components/tree'
import { present, renderUI } from '../../helpers'

/**
 * The tree removes the outer block padding of its first and last visible
 * rows, so its edges are flush with its container. The last visible row is
 * the last row of the deepest open last branch, not the row of the last
 * top-level item. An open last branch keeps the bottom padding of its row
 * against its first child.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet.
 */

/** The block padding of a row: `[top, bottom]`. */
function pads(row: Element): [number, number] {
	const style = getComputedStyle(row)

	return [Number.parseFloat(style.paddingTop), Number.parseFloat(style.paddingBottom)]
}

/** The rows of a tree, in visible order, and the bottom space below the last row. */
function measure(tree: ReactElement) {
	const root = present(
		renderUI(tree).container.querySelector('[data-slot="tree"]'),
		'tree',
	) as HTMLElement

	const rows = Array.from(root.querySelectorAll('[role="treeitem"]')).filter(
		(row) => row.getClientRects().length > 0,
	)

	const last = present(rows.at(-1), 'last row')

	return {
		rows,
		pad: pads(present(rows[0], 'first row'))[1],
		bottomSpace: root.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom,
	}
}

describe.each(['active', 'always'] as const)('Tree edge rows (mount %s)', (mount) => {
	it('keeps the pad of an open last branch row and trims its last child row', () => {
		const { rows, pad, bottomSpace } = measure(
			<Tree aria-label="Files" mount={mount}>
				<TreeItem label="README.md" />
				<TreeItem label="src" defaultOpen>
					<TreeItem label="a.ts" />
					<TreeItem label="b.ts" />
				</TreeItem>
			</Tree>,
		)

		expect(pad).toBeGreaterThan(0)

		expect(rows.map(pads)).toStrictEqual([
			[0, pad],
			[pad, pad],
			[pad, pad],
			[pad, 0],
		])

		expect(bottomSpace).toBe(0)
	})

	it('trims the last row of the deepest open last branch', () => {
		const { rows, pad, bottomSpace } = measure(
			<Tree aria-label="Files" mount={mount}>
				<TreeItem label="src" defaultOpen>
					<TreeItem label="lib" defaultOpen>
						<TreeItem label="x.ts" />
					</TreeItem>
					<TreeItem label="hooks">
						<TreeItem label="y.ts" />
					</TreeItem>
				</TreeItem>
			</Tree>,
		)

		// The last child `hooks` is a closed branch, so its row is the last visible row.
		expect(rows.map(pads)).toStrictEqual([
			[0, pad],
			[pad, pad],
			[pad, pad],
			[pad, 0],
		])

		expect(bottomSpace).toBe(0)
	})

	it('trims the row of a closed last branch', () => {
		const { rows, pad, bottomSpace } = measure(
			<Tree aria-label="Files" mount={mount}>
				<TreeItem label="README.md" />
				<TreeItem label="src">
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		expect(rows.map(pads)).toStrictEqual([
			[0, pad],
			[pad, 0],
		])

		expect(bottomSpace).toBe(0)
	})
})

describe('TreeSkeleton edge rows', () => {
	it('trims the last row when the last row is nested', () => {
		// The rows go to the depths 0, 1, 2, 1: the last row is nested.
		const root = present(
			renderUI(<TreeSkeleton rows={4} />).container.firstElementChild,
			'skeleton',
		)

		const rows = Array.from(root.children)

		const pad = pads(present(rows[0], 'first row'))[1]

		expect(pad).toBeGreaterThan(0)

		expect(rows.map(pads)).toStrictEqual([
			[0, pad],
			[pad, pad],
			[pad, pad],
			[pad, 0],
		])
	})
})

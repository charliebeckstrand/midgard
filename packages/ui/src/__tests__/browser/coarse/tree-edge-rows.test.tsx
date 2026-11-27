import { describe, expect, it } from 'vitest'
import { Tree, TreeItem, TreeSkeleton } from '../../../components/tree'
import { densitySteps } from '../../../core/density'
import { getSlot, present, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A row of a tree is its own hit area, and the rows touch. On a coarse
 * pointer, each row is at least 44 px tall, so a finger does not hit the next
 * row. The tree does not trim the padding of its edge rows there, because a
 * trim only moves the content of a row off the middle of the row. The content
 * of each row is thus in the middle of the row, and the rows have one pitch.
 * The rows of `TreeSkeleton` have the same height.
 *
 * The page has a touch screen, so the real `(pointer: coarse)` rules of the CSS
 * lay out each case. `geometry/tree-edge-rows.test.tsx` holds the cases of a
 * fine pointer.
 */

/** The coarse floor of `TouchTarget` and of the touch pitch, in px. */
const FLOOR = 44

/** The block padding of a row: `[top, bottom]`. */
function pads(row: Element): [number, number] {
	const style = getComputedStyle(row)

	return [Number.parseFloat(style.paddingTop), Number.parseFloat(style.paddingBottom)]
}

/** A tree whose last item is an open branch, at the density `size`. */
function renderTree(size?: (typeof densitySteps)[number]) {
	const root = getSlot(
		renderUI(
			<Tree aria-label="Files" size={size}>
				<TreeItem label="README.md" />
				<TreeItem label="src" defaultOpen>
					<TreeItem label="a.ts" />
					<TreeItem label="b.ts" />
				</TreeItem>
			</Tree>,
		).container,
		'tree',
	)

	return Array.from(root.querySelectorAll('[role="treeitem"]')).filter(
		(row) => row.getClientRects().length > 0,
	)
}

describe('Tree rows on a coarse pointer', () => {
	it.each(densitySteps)('gives each row the floor and one pitch at size %s', (size) => {
		const rows = renderTree(size)

		const height = present(rows[0], 'first row').getBoundingClientRect().height

		expect(height).toBeGreaterThanOrEqual(FLOOR - HALF_PIXEL)

		for (const [index, row] of rows.entries()) {
			const box = row.getBoundingClientRect()

			expect(box.height).toBeNear(height, HALF_PIXEL)

			const [top, bottom] = pads(row)

			expect(top).toBeGreaterThan(0)

			expect(bottom).toBe(top)

			const above = rows[index - 1]

			if (above) expect(box.top).toBeNear(above.getBoundingClientRect().bottom, HALF_PIXEL)
		}
	})

	it.each(densitySteps)('gives each skeleton row the height of a tree row at size %s', (size) => {
		const height = present(renderTree(size)[0], 'first row').getBoundingClientRect().height

		const skeleton = present(
			renderUI(<TreeSkeleton rows={4} size={size} />).container.firstElementChild,
			'skeleton',
		)

		for (const row of Array.from(skeleton.children)) {
			expect(row.getBoundingClientRect().height).toBeNear(height, HALF_PIXEL)
		}
	})
})

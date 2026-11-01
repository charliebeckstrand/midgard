import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { measureColumns } from '../../modules/grid/engine/grid-sizing/measure'

// The exact width of laid-out text. This case reads text through a `Range`, so it
// has its own file. The module of `measureColumns` keeps one `Range` for each
// file, and a case of `grid-sizing-measure.test.ts` counts its creation.

type Row = { id: number }

const columns: GridColumn<Row>[] = [{ id: 'a', title: 'A', cell: () => 'a' }]

describe('measureColumns', () => {
	// WebKit rounds the width of laid-out text up to its layout unit (1/64 px), and
	// a `Range` reports the width before the rounding. A least width from the
	// `Range` alone is then a fraction of a pixel short, and the held column
	// truncates its widest text after hydration. The pass reads the widest text
	// leaf again at `max-content`, free of the `min-w-full` of the leaf, and
	// widens no other text leaf.
	it('reads the widest text leaf of a column at the width of the layout', () => {
		const container = document.createElement('div')

		const cells = [0, 1, 2]
			.map((i) => `<tr><td data-grid-col="a"><span data-grid-content>Value ${i}</span></td></tr>`)
			.join('')

		container.innerHTML = `<table><thead><tr><th data-grid-col="a"><span data-grid-content>A</span></th></tr></thead><tbody>${cells}</tbody></table>`

		document.body.append(container)

		onTestFinished(() => container.remove())

		const leaves = [...container.querySelectorAll<HTMLElement>('tbody [data-grid-content]')]

		// The text widths that a `Range` reports, and the widths that the layout gives
		// them. The second leaf is the widest.
		const text = new Map(leaves.map((leaf, i) => [leaf, [80.2, 102.2227, 90.5][i] ?? 0]))

		const laidOut = new Map(leaves.map((leaf, i) => [leaf, [80.203125, 102.234375, 90.5][i] ?? 0]))

		const COLUMN = 140

		const CHROME = 16

		const widened: HTMLElement[] = []

		const rangeRect = Range.prototype.getBoundingClientRect

		Range.prototype.getBoundingClientRect = function (this: Range) {
			const node = this.startContainer

			const width = node instanceof HTMLElement ? (text.get(node) ?? 0) : 0

			return DOMRect.fromRect({ width })
		}

		onTestFinished(() => {
			Range.prototype.getBoundingClientRect = rangeRect
		})

		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element,
		) {
			// The header is narrower than its column, so the body alone sizes it.
			if (this instanceof HTMLTableCellElement) {
				return DOMRect.fromRect({ width: this.tagName === 'TD' ? COLUMN + CHROME : 40 })
			}

			if (!(this instanceof HTMLElement) || !laidOut.has(this)) return DOMRect.fromRect()

			const free = this.style.width === 'max-content' && this.style.minWidth === '0px'

			if (free) widened.push(this)

			return DOMRect.fromRect({ width: free ? laidOut.get(this) : COLUMN })
		})

		const measurement = measureColumns({ columns, container, scan: new Set(['a']) })

		expect(measurement.leaves.get('a')).toBe(CHROME + 102.234375)

		expect(measurement.bodies.get('a')).toBe(CHROME + 102.234375)

		expect(widened).toEqual([leaves[1]])

		// The read reverts the inline styles of the leaf.
		expect(leaves[1]?.getAttribute('style')).toBe('')
	})
})

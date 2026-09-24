/**
 * The client-grouped and master-detail bodies under `virtualize`. Each body
 * windows one item list through the measured path of `useVirtualWindow`. The
 * mount scenarios time one mount plus teardown per iteration. The toggle
 * scenarios time one group toggle, or one detail toggle, on a mounted grid.
 *
 * jsdom lays nothing out, and a window over a zero-height viewport holds no
 * rows. {@link modelLayout} gives the scroller a viewport and each row a
 * height, as `chat-render.bench.tsx` does for the transcript. The model patches
 * `HTMLElement.prototype`, so it lives in this file alone and the flat-body
 * scenarios of `grid.bench.tsx` keep the jsdom layout they measured before.
 */

import { act } from '@testing-library/react'
import { describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from './fixtures'
import { mountBenches, persistentTree } from './harness'

/** The modelled viewport of the grid scroller, in pixels. */
const VIEWPORT = 600

/** The modelled height of each row, in pixels. It matches the snug estimate. */
const ROW = 44

/** The modelled height of each detail panel, in pixels. */
const DETAIL = 150

/** The scroller's offset, per element, as the modelled layout stores it. */
const offsets = new WeakMap<Element, number>()

/**
 * Gives the grid scroller and its window rows the geometry a browser would.
 *
 * @remarks The model is small on purpose. The scroller has a fixed viewport,
 * each window row has the row height, and each detail panel has a fixed
 * height. A scroll write stores the offset and fires `scroll` in a microtask.
 */
function modelLayout() {
	const isScroller = (element: HTMLElement) => element.dataset.slot === 'grid-scroll'

	const rowHeight = (element: HTMLElement) => {
		if (element.tagName !== 'TR' || !element.hasAttribute('data-index')) return 0

		return element.hasAttribute('data-detail-row') ? DETAIL : ROW
	}

	const define = (key: string, get: (element: HTMLElement) => number) => {
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get(this: HTMLElement) {
				return get(this)
			},
		})
	}

	define('offsetHeight', (element) => (isScroller(element) ? VIEWPORT : rowHeight(element)))

	define('offsetWidth', (element) => (isScroller(element) ? 1000 : 0))

	define('clientHeight', (element) => (isScroller(element) ? VIEWPORT : 0))

	Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
		configurable: true,
		get(this: HTMLElement) {
			return offsets.get(this) ?? 0
		},
		set(this: HTMLElement, value: number) {
			offsets.set(this, value)
		},
	})

	HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: ScrollToOptions) {
		this.scrollTop = Math.max(options?.top ?? 0, 0)

		// A browser fires `scroll` after the write, never inside it.
		queueMicrotask(() => act(() => void this.dispatchEvent(new Event('scroll'))))
	} as HTMLElement['scrollTo']
}

modelLayout()

const COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({ id, title }))

const EXPANDER: GridColumn<Shipment>[] = [{ id: 'expand', expander: true }, ...COLUMNS]

const SIZES = [1_000, 5_000, 10_000] as const

const CASES = SIZES.map((size) => ({
	label: `${size.toLocaleString('en-US')} rows`,
	rows: shipments(size),
}))

const detail = (row: Shipment) => <div>Detail for {row.reference}</div>

function grouped(rows: Shipment[]) {
	return (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			groupBy={{ value: 'carrier' }}
			virtualize
			maxHeight="600px"
		/>
	)
}

function masterDetail(rows: Shipment[]) {
	return (
		<Grid
			columns={EXPANDER}
			rows={rows}
			getKey={shipmentKey}
			expandable={{ render: detail }}
			virtualize
			maxHeight="600px"
		/>
	)
}

/** Finds the toggle a scenario clicks, and fails when the window holds no rows. */
function toggleIn(container: HTMLElement, selector: string): HTMLElement {
	const toggle = container.querySelector<HTMLElement>(selector)

	if (!toggle) throw new Error(`the window rendered no toggle (${selector})`)

	return toggle
}

describe('Grid · grouped · virtualize (modelled 600px viewport)', () => {
	mountBenches(
		CASES,
		({ label }) => `mount ${label}`,
		({ rows }) => grouped(rows),
	)

	for (const { label, rows } of CASES) {
		// Each iteration toggles the first group, so the runs alternate a collapse
		// and an expand.
		persistentTree(grouped(rows), (container) =>
			toggleIn(container, '[data-group-row] button'),
		).bench(`toggle ${label}`, (toggle) => act(() => toggle.click()))
	}
})

describe('Grid · master-detail · virtualize (modelled 600px viewport)', () => {
	mountBenches(
		CASES,
		({ label }) => `mount ${label}`,
		({ rows }) => masterDetail(rows),
	)

	for (const { label, rows } of CASES) {
		// Each iteration toggles the first panel, so the runs alternate an open and
		// a close.
		persistentTree(masterDetail(rows), (container) =>
			toggleIn(container, 'button[aria-controls^="grid-detail-"]'),
		).bench(`toggle ${label}`, (toggle) => act(() => toggle.click()))
	}
})

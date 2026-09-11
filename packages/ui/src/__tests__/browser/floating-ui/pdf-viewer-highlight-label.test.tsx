import { describe, expect, it } from 'vitest'
import {
	PdfViewer,
	type PdfViewerHighlight,
	type PdfViewerPage,
} from '../../../components/pdf-viewer'
import { bySlot, fireEvent, noop, present, renderUI, screen, waitFor } from '../../helpers'

/** The name itself. Portalled, so it is found on the document rather than in the container. */
const label = () => bySlot(document.body, 'pdf-viewer-highlight-label')

/**
 * The selected region's name, against real layout and the real floating engine.
 *
 * Everything about where this label lands is invisible to the jsdom suite, which mocks
 * `@floating-ui/react` down to a no-op `setReference` and measures every rect as zero. What
 * that suite can prove is that the right string appears, disappears with the overlay, and
 * follows the selection. What only a browser can prove is the part the label exists for: that
 * it sits clear of the box it names, and that the two transforms between it and the page —
 * the layer's `rotate()` and the viewport's own scrolling — do not carry it off screen.
 */
describe('pdf viewer highlight label (real browser)', () => {
	const pages: PdfViewerPage[] = [
		{
			id: 'a',
			// A 1x1 transparent GIF: a real decodable image, so the page frame takes a size
			// without a network fetch. The point size is what the regions are measured against.
			src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
			label: 'Page 1',
			pointWidth: 612,
			pointHeight: 792,
		},
	]

	/** Mid-page, so there is room above it for the label either way the engine flips. */
	const highlights: PdfViewerHighlight[] = [
		{
			id: 'total',
			page: 1,
			rect: { x: 0.2, y: 0.45, width: 0.35, height: 0.05 },
			label: 'Total charges',
		},
	]

	function setup() {
		return renderUI(
			<div style={{ width: '520px', height: '620px' }}>
				<PdfViewer pages={pages} highlights={highlights} onActiveHighlightChange={noop} />
			</div>,
		)
	}

	it('draws the name clear of the region it names, and inside the viewer', async () => {
		const { container } = setup()

		// Awaited: the layer draws nothing until the viewport has been measured and the page
		// image has decoded, neither of which has happened by the end of the first commit.
		const region = await screen.findByLabelText('Total charges')

		fireEvent.mouseDown(region)

		await waitFor(() => expect(label()).toBeInTheDocument())

		// The panel is what carries the position; the span inside it is what carries the name.
		const panel = present(label()?.closest('[data-slot="tooltip-content"]'), 'the label panel')

		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))

		const name = panel.getBoundingClientRect()

		const box = region.getBoundingClientRect()

		// Above the region — the placement asked for — and not overlapping it, which is the
		// whole point: a name drawn over the box hides the very content being checked.
		expect(name.bottom).toBeLessThanOrEqual(box.top + 1)

		// Roughly centred on the box it names, so which region it belongs to is unambiguous
		// even where two sit close together.
		expect(Math.abs((name.left + name.right) / 2 - (box.left + box.right) / 2)).toBeLessThan(24)

		// Still on screen. The layer it is declared inside is transformed and clipped by a
		// scrolling viewport; a label that inherited either would land outside the viewer.
		const viewer = present(container.querySelector('[data-slot="pdf-viewer"]'), 'the viewer')

		const frame = viewer.getBoundingClientRect()

		expect(name.top).toBeGreaterThanOrEqual(frame.top - 1)

		expect(name.left).toBeGreaterThanOrEqual(frame.left - 1)

		expect(name.right).toBeLessThanOrEqual(frame.right + 1)
	})

	/*
	 * The region keeps the focus a press or a roving key put on it. The label anchors to that
	 * same element, so the one thing it must not do is replace it — an earlier shape of this
	 * wrapped the active region in a `<Tooltip>`, which changed the element at that position
	 * and remounted it mid-selection.
	 */
	/*
	 * A press that lands on the name and on nothing else presses nothing. A press on the page
	 * puts the selection down, and the name is not the page: answering a press on it by throwing
	 * the selection away would be the viewer reading "this one" as "not this one".
	 */
	it('keeps the selection through a press that lands on the name alone', async () => {
		setup()

		const region = await screen.findByLabelText('Total charges')

		fireEvent.mouseDown(region)

		await waitFor(() => expect(label()).toBeInTheDocument())

		const panel = present(
			label()?.closest<HTMLElement>('[data-slot="tooltip-content"]'),
			'the name panel',
		)

		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))

		const name = panel.getBoundingClientRect()

		const x = (name.left + name.right) / 2

		const y = (name.top + name.bottom) / 2

		// What a press there actually reaches. The name takes no pointer events, so it is the
		// page under the name — which is the whole point of pressing here rather than on it.
		const beneath = present(document.elementFromPoint(x, y), 'what lies under the name')

		expect(beneath).not.toBe(panel)

		fireEvent.mouseDown(beneath, { clientX: x, clientY: y })

		expect(region).toHaveAttribute('aria-current', 'true')
	})

	it('leaves the region it names focused and in place', async () => {
		setup()

		const region = await screen.findByLabelText('Total charges')

		region.focus()

		fireEvent.mouseDown(region)

		await waitFor(() => expect(label()).toBeInTheDocument())

		expect(screen.getByLabelText('Total charges')).toBe(region)

		expect(document.activeElement).toBe(region)
	})
})

/**
 * The name as an obstacle, against real layout and the real floating engine.
 *
 * A name is drawn 8px above the box it names, and on a dense page that is somebody else's box.
 * The reader has to be able to reach the box under it — and to see that they can, which is the
 * fade. Neither half can be proved where nothing is laid out and nothing is hit-tested: the
 * jsdom suite can say the panel takes no pointer events, and that is all it can say.
 */
describe('a name that stands over another region (real browser)', () => {
	const pages: PdfViewerPage[] = [
		{
			id: 'a',
			src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
			label: 'Page 1',
			pointWidth: 612,
			pointHeight: 792,
		},
	]

	/*
	 * Two boxes, a hair apart. `Above` is deep enough that the name of `Below` — 8px clear of
	 * `Below`'s top edge — has to land inside it; the test proves that rather than assuming it.
	 */
	const highlights: PdfViewerHighlight[] = [
		{ id: 'above', page: 1, rect: { x: 0.2, y: 0.3, width: 0.5, height: 0.14 }, label: 'Above' },
		{ id: 'below', page: 1, rect: { x: 0.2, y: 0.45, width: 0.5, height: 0.05 }, label: 'Below' },
		// Far enough down that its own name covers nothing, so a selection landing here is a
		// selection whose name is in nobody's way.
		{ id: 'far', page: 1, rect: { x: 0.2, y: 0.8, width: 0.5, height: 0.05 }, label: 'Far' },
	]

	/** Selects `Below` and returns its name's panel, the box the reader has to see through. */
	async function named() {
		renderUI(
			<div style={{ width: '520px', height: '620px' }}>
				<PdfViewer pages={pages} highlights={highlights} onActiveHighlightChange={noop} />
			</div>,
		)

		const above = await screen.findByLabelText('Above')

		fireEvent.mouseDown(await screen.findByLabelText('Below'))

		await waitFor(() => expect(label()).toBeInTheDocument())

		const panel = present(
			label()?.closest<HTMLElement>('[data-slot="tooltip-content"]'),
			'the name panel',
		)

		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))

		const name = panel.getBoundingClientRect()

		const box = above.getBoundingClientRect()

		// The premise, measured rather than assumed: with no overlap there is nothing to prove.
		expect(name.top).toBeLessThan(box.bottom)

		expect(name.bottom).toBeGreaterThan(box.top)

		return {
			above,
			panel,
			// A point inside both, which is what "the part of the box behind the name" means.
			covered: {
				x: (Math.max(name.left, box.left) + Math.min(name.right, box.right)) / 2,
				y: (Math.max(name.top, box.top) + Math.min(name.bottom, box.bottom)) / 2,
			},
		}
	}

	/*
	 * A name that moved is a new name, and it covers nothing until the pointer says otherwise.
	 *
	 * The selection can move without the viewer touching it — a list beside the viewer drives
	 * `activeHighlightId`, and nothing about that is a pointer event. So the faintness is cleared
	 * by the name it was measured against changing, rather than by the two paths a press takes;
	 * measured from the pointer alone, the next name would paint faint over its own region until
	 * the reader happened to move.
	 */
	it('comes back solid when the consumer moves the selection under a still pointer', async () => {
		function Driven({ active }: { active: string }) {
			return (
				<div style={{ width: '520px', height: '620px' }}>
					<PdfViewer
						pages={pages}
						highlights={highlights}
						activeHighlightId={active}
						onActiveHighlightChange={noop}
					/>
				</div>
			)
		}

		const { rerender } = renderUI(<Driven active="below" />)

		const above = await screen.findByLabelText('Above')

		const panel = present(
			label()?.closest<HTMLElement>('[data-slot="tooltip-content"]'),
			'the name panel',
		)

		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(0))

		const name = panel.getBoundingClientRect()

		const box = above.getBoundingClientRect()

		const x = (Math.max(name.left, box.left) + Math.min(name.right, box.right)) / 2

		const y = (Math.max(name.top, box.top) + Math.min(name.bottom, box.bottom)) / 2

		fireEvent.mouseOver(above, { clientX: x, clientY: y })

		fireEvent.mouseMove(above, { clientX: x, clientY: y })

		await waitFor(() => expect(getComputedStyle(panel).opacity).toBe('0.25'))

		// The pointer does not move. Only the consumer's selection does.
		rerender(<Driven active="far" />)

		await waitFor(() => expect(screen.getByLabelText('Far')).toHaveAttribute('aria-current'))

		const moved = present(
			label()?.closest<HTMLElement>('[data-slot="tooltip-content"]'),
			'the name panel',
		)

		await waitFor(() => expect(getComputedStyle(moved).opacity).toBe('1'))
	})

	/*
	 * The browser's own hit test, which is the whole of "you can click through it": whatever
	 * `elementFromPoint` answers is what a press at that point will reach.
	 */
	it('hands the pointer to the box it covers', async () => {
		const { above, covered } = await named()

		expect(document.elementFromPoint(covered.x, covered.y)).toBe(above)
	})

	it('goes faint while the pointer reads that box, and comes back when it leaves', async () => {
		const { above, panel, covered } = await named()

		await waitFor(() => expect(getComputedStyle(panel).opacity).toBe('1'))

		fireEvent.mouseOver(above, { clientX: covered.x, clientY: covered.y })

		fireEvent.mouseMove(above, { clientX: covered.x, clientY: covered.y })

		await waitFor(() => expect(getComputedStyle(panel).opacity).toBe('0.25'))

		// Still on the box, on the part of it the name does not cover: it is in nothing's way
		// there, so it is solid again.
		const box = above.getBoundingClientRect()

		fireEvent.mouseMove(above, { clientX: box.left + 2, clientY: box.top + 2 })

		await waitFor(() => expect(getComputedStyle(panel).opacity).toBe('1'))
	})

	/** A press through the name selects the box under it, which is the point of letting it through. */
	it('selects the box a press through it lands on', async () => {
		const { above, covered } = await named()

		fireEvent.mouseDown(above, { clientX: covered.x, clientY: covered.y })

		await waitFor(() => expect(above).toHaveAttribute('aria-current', 'true'))

		expect(screen.getByLabelText('Below')).not.toHaveAttribute('aria-current')
	})
})

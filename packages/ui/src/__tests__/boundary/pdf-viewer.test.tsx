import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer, type PdfViewerHighlight, type PdfViewerPage } from '../../components/pdf-viewer'
import { usePdfViewerHighlightsContext } from '../../components/pdf-viewer/pdf-viewer-highlights-context'
import { PdfViewerHighlightsProvider } from '../../components/pdf-viewer/pdf-viewer-highlights-provider'
import { downloadPdf, printPdf } from '../../components/pdf-viewer/pdf-viewer-utilities'
import { PdfViewerZoomControls } from '../../components/pdf-viewer/pdf-viewer-zoom-controls'
import { Toolbar } from '../../components/toolbar'
import { BREAKPOINT_WIDTHS } from '../../types/responsive'
import {
	act,
	allBySlot,
	bySlot,
	fireEvent,
	noop,
	renderUI,
	screen,
	stubMatchMedia,
	userEvent,
} from '../helpers'
import { captureAppended } from '../helpers/capture-appended'

beforeEach(() => {
	// Defaults to desktop so the thumbnail sidebar renders, and drives isDesktop
	// through matchMedia because the real `useMinBreakpoint` path is the behaviour
	// under test. Keyed off the scale rather than a literal, so the two cannot drift.
	stubMatchMedia((query) => query === `(min-width: ${BREAKPOINT_WIDTHS.lg})`)
})

const pages: PdfViewerPage[] = [
	{ id: 'a', src: 'page-1.png', label: 'Page 1' },
	{ id: 'b', src: 'page-2.png', label: 'Page 2' },
	{ id: 'c', src: 'page-3.png', label: 'Page 3' },
]

describe('PdfViewer', () => {
	it('renders with data-slot="pdf-viewer"', () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		const el = bySlot(container, 'pdf-viewer')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SECTION')
	})

	it('renders the active page image with the first page by default', () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		const viewport = bySlot(container, 'pdf-viewer-viewport')

		const img = viewport?.querySelector('img')

		expect(img).toHaveAttribute('src', 'page-1.png')

		expect(img).toHaveAttribute('alt', 'Page 1')
	})

	it('shows the total page count', () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		expect(bySlot(container, 'pdf-viewer-page-status')).toHaveTextContent('3')
	})

	it('renders a thumbnail per page in the sidebar', () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		expect(allBySlot(container, 'pdf-viewer-thumbnail')).toHaveLength(3)
	})

	it('marks the current thumbnail with data-current', () => {
		const { container } = renderUI(<PdfViewer pages={pages} defaultPage={2} />)

		const thumbnails = allBySlot(container, 'pdf-viewer-thumbnail')

		expect(thumbnails[0]).not.toHaveAttribute('data-current')

		expect(thumbnails[1]).toHaveAttribute('data-current')
	})

	it('changes pages when a thumbnail is clicked', () => {
		const onPageChange = vi.fn()

		const { container } = renderUI(<PdfViewer pages={pages} onPageChange={onPageChange} />)

		const thumbnails = allBySlot(container, 'pdf-viewer-thumbnail')

		fireEvent.click(thumbnails[2] as HTMLElement)

		expect(onPageChange).toHaveBeenCalledWith(3)
	})

	it('shows the current page in the page selector', () => {
		const { container } = renderUI(<PdfViewer pages={pages} defaultPage={2} />)

		expect(bySlot(container, 'listbox-button')).toHaveTextContent('2')
	})

	it('disables zoom in at the maximum', () => {
		renderUI(<PdfViewer pages={pages} defaultZoom={4} />)

		expect(screen.getByLabelText('Zoom in')).toBeDisabled()
	})

	it('disables zoom out at the minimum', () => {
		renderUI(<PdfViewer pages={pages} defaultZoom={0.5} />)

		expect(screen.getByLabelText('Zoom out')).toBeDisabled()
	})

	it('rotates the active page in 90 degree steps', async () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		const img = bySlot(container, 'pdf-viewer-viewport')?.querySelector('img') as HTMLImageElement

		const user = userEvent.setup()

		expect(img.style.transform).toContain('rotate(0deg)')

		await user.click(screen.getByLabelText('Rotate'))

		expect(img.style.transform).toContain('rotate(90deg)')
	})

	it('hides download and print actions when no src is provided', () => {
		renderUI(<PdfViewer pages={pages} />)

		expect(screen.queryByLabelText('Download')).not.toBeInTheDocument()

		expect(screen.queryByLabelText('Print')).not.toBeInTheDocument()
	})

	it('shows download and print actions when src is provided', () => {
		renderUI(<PdfViewer pages={pages} src="/sample.pdf" />)

		expect(screen.getByLabelText('Download')).toBeInTheDocument()

		expect(screen.getByLabelText('Print')).toBeInTheDocument()
	})

	it('triggers a download when the Download button is clicked', () => {
		const anchor = captureAppended(() => {
			renderUI(<PdfViewer pages={pages} src="/sample.pdf" filename="doc.pdf" />)

			fireEvent.click(screen.getByLabelText('Download'))
		}, 'a')

		expect(anchor.href).toContain('/sample.pdf')

		expect(anchor.download).toBe('doc.pdf')
	})

	it('triggers a print iframe when the Print button is clicked', () => {
		const iframe = captureAppended(() => {
			renderUI(<PdfViewer pages={pages} src="/sample.pdf" />)

			fireEvent.click(screen.getByLabelText('Print'))
		}, 'iframe')

		expect(iframe.src).toContain('/sample.pdf')
	})

	it('renders an empty state when there are no pages', () => {
		const { container } = renderUI(<PdfViewer pages={[]} />)

		expect(bySlot(container, 'pdf-viewer-viewport')).toHaveTextContent('No pages to display')
	})

	it('toggles the desktop thumbnail sidebar from the toolbar', async () => {
		const { container } = renderUI(<PdfViewer pages={pages} />)

		const sidebar = bySlot(container, 'pdf-viewer-sidebar')

		expect(sidebar).not.toHaveAttribute('inert')

		const toggle = screen.getByLabelText('Hide thumbnails')

		expect(toggle).toHaveAttribute('aria-expanded', 'true')

		const user = userEvent.setup()

		await user.click(toggle)

		const collapsedToggle = screen.getByLabelText('Show thumbnails')

		expect(collapsedToggle).toHaveAttribute('aria-expanded', 'false')

		expect(bySlot(container, 'pdf-viewer-sidebar')).toHaveAttribute('inert')
	})

	/*
	 * A one-page document has nothing to navigate to, so the rail would spend 224px of a panel
	 * that is routinely the narrower half of a split on a tile of the page already on screen.
	 *
	 * Asserted through the toolbar's own toggle rather than the `inert` attribute, because that
	 * is the state a reader can see and act on — and `inert` lands a frame later, once the
	 * sidebar's slide has settled.
	 */
	it('opens with the thumbnail sidebar closed on a single-page document', () => {
		renderUI(<PdfViewer pages={pages.slice(0, 1)} />)

		expect(screen.getByLabelText('Show thumbnails')).toHaveAttribute('aria-expanded', 'false')
	})

	// The reader's own press outranks that default, and nothing re-derives it out from under
	// them — the whole reason the state is an override rather than a seeded boolean.
	it('keeps the sidebar the reader opened on a single-page document', async () => {
		renderUI(<PdfViewer pages={pages.slice(0, 1)} />)

		await userEvent.setup().click(screen.getByLabelText('Show thumbnails'))

		expect(screen.getByLabelText('Hide thumbnails')).toHaveAttribute('aria-expanded', 'true')
	})

	it('opens the mobile thumbnails sheet when toggled', async () => {
		stubMatchMedia(() => false)

		renderUI(<PdfViewer pages={pages} />)

		const toggle = screen.getByLabelText('Show thumbnails')

		expect(toggle).toHaveAttribute('aria-expanded', 'false')

		const user = userEvent.setup()

		await user.click(toggle)

		expect(screen.getByLabelText('Show thumbnails')).toHaveAttribute('aria-expanded', 'true')
	})

	it('exposes the aria-label on the root', () => {
		const { container } = renderUI(<PdfViewer pages={pages} aria-label="Invoice viewer" />)

		expect(bySlot(container, 'pdf-viewer')).toHaveAttribute('aria-label', 'Invoice viewer')
	})

	it("does not size the next page using the previous page's natural dimensions", () => {
		const { container, rerender } = renderUI(<PdfViewer pages={pages} page={1} />)

		const viewport = bySlot(container, 'pdf-viewer-viewport') as HTMLElement

		const img = viewport.querySelector('img') as HTMLImageElement

		Object.defineProperty(img, 'naturalWidth', { value: 800, configurable: true })

		Object.defineProperty(img, 'naturalHeight', { value: 600, configurable: true })

		act(() => {
			fireEvent.load(img)
		})

		expect(viewport.style.aspectRatio).toBe('800 / 600')

		rerender(<PdfViewer pages={pages} page={2} />)

		// Without the per-page reset, the viewport would keep the previous page's
		// 800/600 ratio until the new image fires its own load event.
		expect(viewport.style.aspectRatio).toBe('8.5 / 11')
	})
})

describe('downloadPdf', () => {
	it('creates an anchor with the src, clicks it, and removes it', () => {
		const createElement = vi.spyOn(document, 'createElement')

		const anchor = captureAppended(() => downloadPdf('/doc.pdf', 'doc.pdf'), 'a')

		expect(createElement).toHaveBeenCalledWith('a')

		expect(anchor.href).toContain('/doc.pdf')

		expect(anchor.download).toBe('doc.pdf')

		expect(anchor.rel).toBe('noopener')

		expect(anchor.target).toBe('_blank')

		expect(anchor.parentNode).toBeNull()
	})

	it('defaults the download attribute to an empty string when no filename is provided', () => {
		const anchor = captureAppended(() => downloadPdf('/doc.pdf'), 'a')

		expect(anchor.download).toBe('')
	})
})

describe('printPdf', () => {
	it('appends a hidden iframe pointing at the src', () => {
		const iframe = captureAppended(() => printPdf('/doc.pdf'), 'iframe')

		expect(iframe.src).toContain('/doc.pdf')

		expect(iframe.getAttribute('aria-hidden')).toBe('true')
	})

	it('opens the pdf in a new tab when the iframe fails to load', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null)

		const iframe = captureAppended(() => printPdf('/fail.pdf'), 'iframe')

		iframe.dispatchEvent(new Event('error'))

		expect(open).toHaveBeenCalledWith('/fail.pdf', '_blank', 'noopener,noreferrer')
	})

	// The frame lifecycle is `printInHiddenFrame`'s, driven by `print-frame.test.ts`.
	// What is the viewer's own is `src` above and the `onFail` arm here.
	it('falls back to a new tab and cleans up when printing through the iframe throws', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null)

		const iframe = captureAppended(() => printPdf('/doc.pdf'), 'iframe')

		const win = {
			addEventListener: vi.fn(),
			focus: vi.fn(),
			print: vi.fn(() => {
				throw new Error('print blocked')
			}),
		}

		Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		expect(open).toHaveBeenCalledWith('/doc.pdf', '_blank', 'noopener,noreferrer')

		expect(iframe.parentNode).toBeNull()
	})
})

describe('PdfViewerZoomControls', () => {
	const levels = [0.5, 1, 2]

	function renderControls(zoomValue: number, zoomLevels: number[], setValue: () => void) {
		return renderUI(
			<Toolbar aria-label="PDF tools">
				<PdfViewerZoomControls
					zoom={{ value: zoomValue, levels: zoomLevels, setValue }}
					disabled={false}
				/>
			</Toolbar>,
		)
	}

	it('steps to the next configured level on zoom in and out', () => {
		const setValue = vi.fn()

		renderControls(1, levels, setValue)

		fireEvent.click(screen.getByLabelText('Zoom in'))

		expect(setValue).toHaveBeenLastCalledWith(2)

		fireEvent.click(screen.getByLabelText('Zoom out'))

		expect(setValue).toHaveBeenLastCalledWith(0.5)
	})

	it('resets to a zoom of 1 on reset zoom', () => {
		const setValue = vi.fn()

		renderControls(2, levels, setValue)

		fireEvent.click(screen.getByLabelText('Reset zoom'))

		expect(setValue).toHaveBeenLastCalledWith(1)
	})

	it('falls back to a zoom of 1 and disables every control when no levels are configured', () => {
		const setValue = vi.fn()

		renderControls(1, [], setValue)

		expect(screen.getByLabelText('Zoom in')).toBeDisabled()

		expect(screen.getByLabelText('Zoom out')).toBeDisabled()

		expect(screen.getByLabelText('Reset zoom')).toBeDisabled()
	})
})

const sizedPages: PdfViewerPage[] = [
	// width/height are the rasterized image's pixels; pointWidth/pointHeight are the page's
	// own US Letter size. Both are needed here: the first makes the page measurable in jsdom
	// (no image load fires), the second is the divisor for an inch-specified region.
	{
		id: 'a',
		src: 'page-1.png',
		label: 'Page 1',
		width: 850,
		height: 1100,
		pointWidth: 612,
		pointHeight: 792,
	},
	{
		id: 'b',
		src: 'page-2.png',
		label: 'Page 2',
		width: 850,
		height: 1100,
		pointWidth: 612,
		pointHeight: 792,
	},
]

const highlights: PdfViewerHighlight[] = [
	{
		id: 'total',
		page: 1,
		rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
		label: 'Total charges',
	},
	{ id: 'pro', page: 2, rect: { x: 0.5, y: 0.6, width: 0.2, height: 0.05 }, label: 'PRO number' },
]

describe('PdfViewer highlights', () => {
	it('renders no layer when there are no highlights', () => {
		const { container } = renderUI(<PdfViewer pages={sizedPages} />)

		expect(bySlot(container, 'pdf-viewer-highlights')).not.toBeInTheDocument()
	})

	it('renders only the active page’s regions', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		expect(screen.getByLabelText('Total charges')).toBeInTheDocument()

		expect(screen.queryByLabelText('PRO number')).not.toBeInTheDocument()
	})

	it('swaps the regions when the page changes', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				defaultPage={2}
				highlights={highlights}
				onActiveHighlightChange={noop}
			/>,
		)

		expect(screen.getByLabelText('PRO number')).toBeInTheDocument()

		expect(screen.queryByLabelText('Total charges')).not.toBeInTheDocument()
	})

	it('positions a region in percentages of the layer', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		const region = screen.getByLabelText('Total charges')

		expect(region.style.left).toBe('10%')

		expect(region.style.top).toBe('20%')

		expect(region.style.width).toBe('30%')

		expect(region.style.height).toBe('5%')
	})

	it('places an inch-specified region exactly where the equivalent fraction lands', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlightUnit="inch"
				// 0.85 in of 8.5 in wide, 2.2 in of 11 in tall — the 10% / 20% above.
				highlights={[
					{
						id: 'total',
						page: 1,
						rect: { x: 0.85, y: 2.2, width: 2.55, height: 0.55 },
						label: 'Total charges',
					},
				]}
				onActiveHighlightChange={noop}
			/>,
		)

		const region = screen.getByLabelText('Total charges')

		expect(region.style.left).toBe('10%')

		expect(region.style.top).toBe('20%')

		expect(region.style.width).toBe('30%')

		expect(region.style.height).toBe('5%')
	})

	it('renders no inch-specified region on a page that carries no extent', () => {
		renderUI(
			<PdfViewer
				pages={[{ id: 'a', src: 'page-1.png', label: 'Page 1', width: 850, height: 1100 }]}
				highlightUnit="inch"
				highlights={[highlights[0] as PdfViewerHighlight]}
				onActiveHighlightChange={noop}
			/>,
		)

		expect(screen.queryByLabelText('Total charges')).not.toBeInTheDocument()
	})

	it('reports the pressed region and marks it aria-current', () => {
		const onActiveHighlightChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				onActiveHighlightChange={onActiveHighlightChange}
			/>,
		)

		const region = screen.getByLabelText('Total charges')

		expect(region).not.toHaveAttribute('aria-current')

		fireEvent.click(region)

		expect(onActiveHighlightChange).toHaveBeenCalledWith('total')

		expect(screen.getByLabelText('Total charges')).toHaveAttribute('aria-current', 'true')
	})

	it('does not report a second change when the active region is pressed again', () => {
		const onActiveHighlightChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				onActiveHighlightChange={onActiveHighlightChange}
			/>,
		)

		fireEvent.click(screen.getByLabelText('Total charges'))

		fireEvent.click(screen.getByLabelText('Total charges'))

		expect(onActiveHighlightChange).toHaveBeenCalledTimes(1)
	})

	it('navigates to the page of a region the consumer activates', () => {
		const onPageChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				activeHighlightId="pro"
				onPageChange={onPageChange}
			/>,
		)

		expect(onPageChange).toHaveBeenCalledWith(2)
	})

	it('does not navigate again when the same activeHighlightId re-renders', () => {
		const onPageChange = vi.fn()

		const { rerender } = renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				activeHighlightId="pro"
				onPageChange={onPageChange}
			/>,
		)

		rerender(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				activeHighlightId="pro"
				onPageChange={onPageChange}
			/>,
		)

		expect(onPageChange).toHaveBeenCalledTimes(1)
	})

	it('renders without throwing when activeHighlightId matches no region', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				activeHighlightId="gone"
				onActiveHighlightChange={noop}
			/>,
		)

		expect(screen.getByLabelText('Total charges')).not.toHaveAttribute('aria-current')
	})

	it('is decoration with no accessible regions when nothing listens for activation', () => {
		const { container } = renderUI(<PdfViewer pages={sizedPages} highlights={highlights} />)

		const layer = bySlot(container, 'pdf-viewer-highlights')

		expect(layer).toHaveAttribute('aria-hidden', 'true')

		expect(layer?.querySelector('button')).toBeNull()

		expect(screen.queryByLabelText('Total charges')).not.toBeInTheDocument()
	})

	/**
	 * The name of the selected region, drawn above it.
	 *
	 * The ring and the deeper wash say which of twenty boxes is selected; they cannot say
	 * which field selected it, and the reviewer who hovered a label across the split is
	 * asking exactly that.
	 *
	 * Queried off `document` and by its own slot, not by the tooltip chrome around it: the
	 * label portals out of the render container, and the toolbar's buttons wear that same
	 * chrome — a bare `[data-slot="tooltip-content"]` catches whichever toolbar tooltip the
	 * click that set up the case left open.
	 */
	function highlightLabel() {
		return bySlot(document.body, 'pdf-viewer-highlight-label')
	}

	it('names the selected region above it', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		// Nothing selected: no name to draw, and no panel floating over the page.
		expect(highlightLabel()).not.toBeInTheDocument()

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		expect(highlightLabel()).toHaveTextContent('Total charges')
	})

	/*
	 * The label follows the selection rather than accumulating: one region is selected at a
	 * time, so there is only ever one name on the page.
	 */
	it('moves the name to the region selected next', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={[
					...highlights,
					{
						id: 'invoice',
						page: 1,
						rect: { x: 0.1, y: 0.4, width: 0.3, height: 0.05 },
						label: 'Invoice number',
					},
				]}
				onActiveHighlightChange={noop}
			/>,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		expect(highlightLabel()).toHaveTextContent('Total charges')

		fireEvent.mouseDown(screen.getByLabelText('Invoice number'))

		expect(highlightLabel()).toHaveTextContent('Invoice number')

		expect(allBySlot(document.body, 'pdf-viewer-highlight-label')).toHaveLength(1)
	})

	/*
	 * A box cannot say what it is, and a reader looking for one of twenty should not have to
	 * press each in turn to find out — every press changes the selection, and whatever the
	 * consumer hangs off it.
	 */
	it('names the region under the pointer, without selecting it', () => {
		const onActiveHighlightChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				onActiveHighlightChange={onActiveHighlightChange}
			/>,
		)

		fireEvent.mouseOver(screen.getByLabelText('Total charges'))

		expect(highlightLabel()).toHaveTextContent('Total charges')

		// Named, not chosen: nothing about the selection moved.
		expect(onActiveHighlightChange).not.toHaveBeenCalled()
	})

	/** Every name on the page right now, in the order they were drawn. */
	function highlightLabels() {
		return allBySlot(document.body, 'pdf-viewer-highlight-label').map((el) => el.textContent)
	}

	/*
	 * A preview sits beside the selection rather than taking its place. They are different
	 * things to a reader — one is where they are working, the other is what they are checking —
	 * and the selection has a form field and a scroll position standing behind it.
	 */
	it('keeps the selected region named while the pointer names another', () => {
		const { container } = renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={[
					...highlights,
					{
						id: 'invoice',
						page: 1,
						rect: { x: 0.1, y: 0.4, width: 0.3, height: 0.05 },
						label: 'Invoice number',
					},
				]}
				onActiveHighlightChange={noop}
			/>,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		fireEvent.mouseOver(screen.getByLabelText('Invoice number'))

		expect(highlightLabels()).toEqual(['Total charges', 'Invoice number'])

		fireEvent.mouseLeave(bySlot(container, 'pdf-viewer-highlights') as HTMLElement)

		// The preview withdraws; the one the reader came here for does not.
		expect(highlightLabels()).toEqual(['Total charges'])
	})

	/*
	 * The selected region already names itself, so hovering it says nothing new — and would say
	 * it twice, in two panels a few pixels apart.
	 */
	it('does not name the selected region twice when the pointer crosses it', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		fireEvent.mouseOver(screen.getByLabelText('Total charges'))

		expect(highlightLabels()).toEqual(['Total charges'])
	})

	/*
	 * The persisted name is a standing object over a layer of pressable boxes. Left transparent
	 * it hands the pointer through to whatever it covers, which then names itself as well — a
	 * second panel a few pixels under the first, for a box the reader is not pointing at.
	 *
	 * jsdom does no hit-testing, so the shield is read off the rule that governs it rather than
	 * by pointing at anything. That rule is `<FloatingSurface>`'s, deliberately: it drops the
	 * wrapper to `none` the moment a panel stops being real, so an exiting name cannot swallow
	 * presses meant for the page — which a subtree that had taken pointer events back on its own
	 * would go on doing for the whole length of the fade.
	 *
	 * What is exercised beyond that is the path the shield opens: the panel portals out of the
	 * layer on screen but stays a child of it in the tree, so a pointer landing on it arrives at
	 * the layer's own handler as a pointer outside every region.
	 */
	it('shields the boxes under the persisted name from the pointer', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={[
					...highlights,
					{
						id: 'invoice',
						page: 1,
						rect: { x: 0.1, y: 0.4, width: 0.3, height: 0.05 },
						label: 'Invoice number',
					},
				]}
				onActiveHighlightChange={noop}
			/>,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		fireEvent.mouseOver(screen.getByLabelText('Invoice number'))

		// Both names up, which is what makes the pair below a pair.
		expect(highlightLabels()).toEqual(['Total charges', 'Invoice number'])

		const [persisted, preview] = allBySlot(document.body, 'pdf-viewer-highlight-label') as [
			HTMLElement,
			HTMLElement,
		]

		const panel = (label: HTMLElement) =>
			label.closest<HTMLElement>('[data-slot="tooltip-content"]')

		expect(panel(persisted)?.style.pointerEvents).toBe('auto')

		// The preview is not a standing object — it dies with the pointer that summoned it, and
		// solid it would close under the pointer that reached it and reopen on the next move.
		expect(panel(preview)?.style.pointerEvents).toBe('none')

		fireEvent.mouseOver(persisted)

		expect(highlightLabels()).toEqual(['Total charges'])
	})

	/*
	 * Hiding the overlay is a reader asking to see the page underneath. The selection survives
	 * it (the layer is hidden, not unmounted), but the name must not: it portals clear of the
	 * layer, so `hidden` does not reach it and it would float over a box that is not drawn.
	 */
	it('withdraws the name while the overlay is hidden, and brings it back', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		fireEvent.click(screen.getByLabelText('Hide highlights'))

		expect(highlightLabel()).not.toBeInTheDocument()

		fireEvent.click(screen.getByLabelText('Show highlights'))

		expect(highlightLabel()).toHaveTextContent('Total charges')
	})

	/*
	 * The region already carries this string as its `aria-label`, and the layer announces it
	 * through a live region. A third copy with a role of its own would have a reader hear the
	 * same name twice for one selection.
	 */
	it('draws the name for the eye only, leaving the region to say it once', () => {
		renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		fireEvent.mouseDown(screen.getByLabelText('Total charges'))

		expect(highlightLabel()).toHaveAttribute('aria-hidden', 'true')

		// One accessible node with this name: the region itself.
		expect(screen.getAllByLabelText('Total charges')).toHaveLength(1)
	})

	it('offers the visibility toggle only when there are regions', () => {
		renderUI(<PdfViewer pages={sizedPages} />)

		expect(screen.queryByLabelText('Hide highlights')).not.toBeInTheDocument()
	})

	it('hides the layer without discarding the selection', () => {
		const { container } = renderUI(
			<PdfViewer pages={sizedPages} highlights={highlights} onActiveHighlightChange={noop} />,
		)

		fireEvent.click(screen.getByLabelText('Total charges'))

		fireEvent.click(screen.getByLabelText('Hide highlights'))

		expect(bySlot(container, 'pdf-viewer-highlights')).toHaveAttribute('hidden')

		fireEvent.click(screen.getByLabelText('Show highlights'))

		expect(bySlot(container, 'pdf-viewer-highlights')).not.toHaveAttribute('hidden')

		expect(screen.getByLabelText('Total charges')).toHaveAttribute('aria-current', 'true')
	})

	it('clears the selection on Escape without letting it reach an enclosing surface', () => {
		const onActiveHighlightChange = vi.fn()

		const onOuterKeyDown = vi.fn()

		renderUI(
			// biome-ignore lint/a11y/noStaticElementInteractions: stands in for a drawer that would read Escape as a dismiss.
			<div onKeyDown={onOuterKeyDown}>
				<PdfViewer
					pages={sizedPages}
					highlights={highlights}
					onActiveHighlightChange={onActiveHighlightChange}
				/>
			</div>,
		)

		const region = screen.getByLabelText('Total charges')

		fireEvent.click(region)

		fireEvent.keyDown(region, { key: 'Escape' })

		expect(onActiveHighlightChange).toHaveBeenLastCalledWith(null)

		expect(onOuterKeyDown).not.toHaveBeenCalled()
	})

	it('keeps the whole layer to one tab stop', () => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={[
					highlights[0] as PdfViewerHighlight,
					{
						id: 'amount',
						page: 1,
						rect: { x: 0.1, y: 0.4, width: 0.2, height: 0.05 },
						label: 'Amount',
					},
				]}
				onActiveHighlightChange={noop}
			/>,
		)

		const stops = [screen.getByLabelText('Total charges'), screen.getByLabelText('Amount')].filter(
			(el) => el.getAttribute('tabindex') !== '-1',
		)

		expect(stops).toHaveLength(1)
	})
})

describe('PdfViewer highlight state scoping', () => {
	// The guard for why activation state lives in its own provider around the viewport
	// rather than on PdfViewerContext: the subtree the provider wraps must not re-render
	// when a region is activated, so the toolbar and the thumbnail rail — which sit outside
	// it and are re-rendered only by a PdfViewer render — cannot either. Asserted at the
	// provider, because that is where the bailout is observable: a component's own render
	// count is not reachable from outside it.
	it('activating a region does not re-render the subtree the provider wraps', () => {
		let wrappedRenders = 0

		function Wrapped() {
			wrappedRenders++

			return <RegionPress />
		}

		// A context consumer inside the wrapped subtree: it must still update, which is what
		// makes the bailout above it meaningful rather than merely inert.
		function RegionPress() {
			const { regions, activate } = usePdfViewerHighlightsContext()

			return (
				<button type="button" onClick={() => activate('total')}>
					{regions.some((region) => region.active) ? 'active' : 'idle'}
				</button>
			)
		}

		// The provider takes what the document gives it, so no `<PdfViewer>` and no stub of
		// its context stand between this and the bailout under test. The layer is not
		// rendered here.
		renderUI(
			<PdfViewerHighlightsProvider
				highlights={highlights}
				onActiveHighlightChange={noop}
				activePage={sizedPages[0]}
				safePage={1}
				goToPage={noop}
			>
				<Wrapped />
			</PdfViewerHighlightsProvider>,
		)

		const rendersAfterMount = wrappedRenders

		expect(screen.getByRole('button')).toHaveTextContent('idle')

		fireEvent.click(screen.getByRole('button'))

		// The consumer saw the activation…
		expect(screen.getByRole('button')).toHaveTextContent('active')

		// …and the subtree it sits in did not re-render to deliver it.
		expect(wrappedRenders).toBe(rendersAfterMount)
	})
})

describe('PdfViewer chrome events', () => {
	/**
	 * The two toolbar switches report themselves.
	 *
	 * Because what they do is not only the viewer's business: a list beside it marks which of
	 * its rows can be located on the page, and a hidden overlay makes that mark a promise
	 * nothing keeps. Events rather than a controlled binding — the reader owns these two
	 * switches, and nothing outside should be able to turn them back on under them.
	 */
	it('reports the reader hiding and then showing the highlight overlay', () => {
		const onHighlightsVisibleChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				highlights={highlights}
				onActiveHighlightChange={noop}
				onHighlightsVisibleChange={onHighlightsVisibleChange}
			/>,
		)

		// Shown to begin with, so the control offers to hide — which is what a consumer
		// mirroring this seeds its own state from.
		fireEvent.click(screen.getByLabelText('Hide highlights'))

		expect(onHighlightsVisibleChange).toHaveBeenCalledExactlyOnceWith(false)

		fireEvent.click(screen.getByLabelText('Show highlights'))

		expect(onHighlightsVisibleChange).toHaveBeenLastCalledWith(true)
	})

	/**
	 * The whole of what the reader owns, on every change — the switch here, and the three
	 * settings the config dialog carries. A consumer that keeps the preference stores what
	 * arrives and hands it back as `magnifier`, so a report of only the field that moved
	 * would not be enough to do that with.
	 */
	it('reports the reader turning the magnifier off and then on', () => {
		const onMagnifierChange = vi.fn()

		renderUI(<PdfViewer pages={sizedPages} magnifier onMagnifierChange={onMagnifierChange} />)

		fireEvent.click(screen.getByLabelText('Turn magnifier off'))

		expect(onMagnifierChange).toHaveBeenCalledExactlyOnceWith({
			enabled: false,
			zoom: 'md',
			size: 'md',
			delay: 'default',
		})

		fireEvent.click(screen.getByLabelText('Turn magnifier on'))

		expect(onMagnifierChange).toHaveBeenLastCalledWith({
			enabled: true,
			zoom: 'md',
			size: 'md',
			delay: 'default',
		})
	})

	/** The settings the consumer opened on, not the defaults, are what the report carries. */
	it('reports the settings the consumer asked for', () => {
		const onMagnifierChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={sizedPages}
				magnifier={{ zoom: 'lg', size: 'sm', delay: 'none' }}
				onMagnifierChange={onMagnifierChange}
			/>,
		)

		fireEvent.click(screen.getByLabelText('Turn magnifier off'))

		expect(onMagnifierChange).toHaveBeenCalledExactlyOnceWith({
			enabled: false,
			zoom: 'lg',
			size: 'sm',
			delay: 'none',
		})
	})

	/** No toggle, nothing to report: the control is only there when a loupe was offered. */
	it('says nothing about a magnifier the consumer never asked for', () => {
		const onMagnifierChange = vi.fn()

		renderUI(<PdfViewer pages={sizedPages} onMagnifierChange={onMagnifierChange} />)

		expect(screen.queryByLabelText('Turn magnifier off')).not.toBeInTheDocument()
		expect(onMagnifierChange).not.toHaveBeenCalled()
	})

	/**
	 * Both switches keep their glyph and name the *action* rather than the state, so
	 * `aria-pressed` was the only thing separating on from off — and no recipe targets it. The
	 * fill is what a pointer user reads.
	 */
	it.each([
		{ control: 'highlight overlay', on: 'Hide highlights', off: 'Show highlights' },
		{ control: 'magnifier', on: 'Turn magnifier off', off: 'Turn magnifier on' },
	])('fills the $control toggle while it is on, and not once it is off', ({ on, off }) => {
		renderUI(
			<PdfViewer
				pages={sizedPages}
				magnifier
				highlights={highlights}
				onActiveHighlightChange={noop}
			/>,
		)

		// Both start on, so each control offers to switch its subject *off*.
		expect(screen.getByLabelText(on)).toHaveAttribute('data-variant', 'soft')

		fireEvent.click(screen.getByLabelText(on))

		expect(screen.getByLabelText(off)).toHaveAttribute('data-variant', 'plain')
	})
})

describe('PdfViewer fit', () => {
	// The guard for the one thing fit="width" cannot do without help. Withholding the page's
	// aspect ratio is what lets the page overflow and scroll — but it also leaves the root
	// with no height of its own, so it has to fill the box its host gives it or it collapses
	// to the toolbar. This shipped once without it.
	it('fills its host box under fit="width"', () => {
		const { container } = renderUI(<PdfViewer pages={sizedPages} fit="width" />)

		expect(bySlot(container, 'pdf-viewer')).toHaveClass('h-full')
	})

	it('sizes itself from the page ratio under fit="page", taking no height from its host', () => {
		const { container } = renderUI(<PdfViewer pages={sizedPages} />)

		expect(bySlot(container, 'pdf-viewer')).not.toHaveClass('h-full')
	})
})

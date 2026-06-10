import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { downloadPdf, printPdf } from '../../components/pdf-viewer/pdf-viewer-utilities'
import { PdfViewerZoomControls } from '../../components/pdf-viewer/pdf-viewer-zoom-controls'
import { Toolbar } from '../../components/toolbar'
import {
	act,
	allBySlot,
	bySlot,
	fireEvent,
	renderUI,
	screen,
	stubMatchMedia,
	userEvent,
	waitFor,
} from '../helpers'

beforeEach(() => {
	// Defaults to desktop so the thumbnail sidebar renders. Drives isDesktop via
	// matchMedia (the real useMinWidth path), not a per-file vi.mock of the
	// shared `../../hooks` barrel; a mock would poison the vmThreads module cache
	// for files that import the barrel unmocked (e.g. a11y/baseline.test.tsx
	// renders the real PdfViewer). See src/__tests__/setup/module-mocks.ts.
	stubMatchMedia((query) => query === '(min-width: 1024px)')
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
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
		const appendChild = vi.spyOn(document.body, 'appendChild')

		renderUI(<PdfViewer pages={pages} src="/sample.pdf" filename="doc.pdf" />)

		fireEvent.click(screen.getByLabelText('Download'))

		const anchor = appendChild.mock.calls.find((c) => (c[0] as HTMLElement).tagName === 'A')?.[0] as
			| HTMLAnchorElement
			| undefined

		expect(anchor?.href).toContain('/sample.pdf')

		expect(anchor?.download).toBe('doc.pdf')

		appendChild.mockRestore()
	})

	it('triggers a print iframe when the Print button is clicked', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		renderUI(<PdfViewer pages={pages} src="/sample.pdf" />)

		fireEvent.click(screen.getByLabelText('Print'))

		const iframe = appendChild.mock.calls.find(
			(c) => (c[0] as HTMLElement).tagName === 'IFRAME',
		)?.[0] as HTMLIFrameElement | undefined

		expect(iframe?.src).toContain('/sample.pdf')

		iframe?.remove()

		appendChild.mockRestore()
	})

	it('renders an empty state when there are no pages', () => {
		const { container } = renderUI(<PdfViewer pages={[]} />)

		expect(bySlot(container, 'pdf-viewer-viewport')).toHaveTextContent('No pages to display')
	})

	it('opens the mobile thumbnails sheet when toggled', async () => {
		stubMatchMedia(() => false)

		renderUI(<PdfViewer pages={pages} />)

		const toggle = screen.getByLabelText('Show thumbnails')

		expect(toggle).toHaveAttribute('aria-expanded', 'false')

		const user = userEvent.setup()

		await user.click(toggle)

		await waitFor(() =>
			expect(screen.getByLabelText('Show thumbnails')).toHaveAttribute('aria-expanded', 'true'),
		)
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
		const appendChild = vi.spyOn(document.body, 'appendChild')

		downloadPdf('/doc.pdf', 'doc.pdf')

		expect(createElement).toHaveBeenCalledWith('a')

		const anchor = appendChild.mock.calls.at(-1)?.[0] as HTMLAnchorElement

		expect(anchor.href).toContain('/doc.pdf')

		expect(anchor.download).toBe('doc.pdf')

		expect(anchor.rel).toBe('noopener')

		expect(anchor.target).toBe('_blank')

		expect(anchor.parentNode).toBeNull()

		createElement.mockRestore()
		appendChild.mockRestore()
	})

	it('defaults the download attribute to an empty string when no filename is provided', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		downloadPdf('/doc.pdf')

		const anchor = appendChild.mock.calls.at(-1)?.[0] as HTMLAnchorElement

		expect(anchor.download).toBe('')

		appendChild.mockRestore()
	})
})

describe('printPdf', () => {
	it('appends a hidden iframe pointing at the src', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/doc.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		expect(iframe.tagName).toBe('IFRAME')

		expect(iframe.src).toContain('/doc.pdf')

		expect(iframe.getAttribute('aria-hidden')).toBe('true')

		iframe.remove()
		appendChild.mockRestore()
	})

	it('opens the pdf in a new tab when the iframe fails to load', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null)
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/fail.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		iframe.dispatchEvent(new Event('error'))

		expect(open).toHaveBeenCalledWith('/fail.pdf', '_blank', 'noopener,noreferrer')

		open.mockRestore()
		appendChild.mockRestore()
	})

	it('cleans up the iframe on load when contentWindow is unavailable', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/doc.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		Object.defineProperty(iframe, 'contentWindow', { value: null, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		expect(iframe.parentNode).toBeNull()

		appendChild.mockRestore()
	})

	it('focuses and prints through the iframe window, deferring cleanup to afterprint', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/doc.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		const win = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() }

		Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		expect(win.focus).toHaveBeenCalled()

		expect(win.print).toHaveBeenCalled()

		expect(win.addEventListener).toHaveBeenCalledWith('afterprint', expect.any(Function))

		// Cleanup is deferred to the afterprint event, so the iframe is still attached.
		expect(iframe.parentNode).not.toBeNull()

		iframe.remove()
		appendChild.mockRestore()
	})

	it('reclaims the iframe when the window regains focus and afterprint never fires', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/doc.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		const win = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() }

		Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		// afterprint never fires; the print dialog closing returns focus to the window.
		expect(iframe.parentNode).not.toBeNull()

		window.dispatchEvent(new Event('focus'))

		expect(iframe.parentNode).toBeNull()

		appendChild.mockRestore()
	})

	it('falls back to a new tab and cleans up when printing through the iframe throws', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null)
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printPdf('/doc.pdf')

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

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

		open.mockRestore()
		appendChild.mockRestore()
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

	it('resets to a zoom of 1 on fit to page', () => {
		const setValue = vi.fn()

		renderControls(2, levels, setValue)

		fireEvent.click(screen.getByLabelText('Fit to page'))

		expect(setValue).toHaveBeenLastCalledWith(1)
	})

	it('falls back to a zoom of 1 and disables every control when no levels are configured', () => {
		const setValue = vi.fn()

		renderControls(1, [], setValue)

		expect(screen.getByLabelText('Zoom in')).toBeDisabled()

		expect(screen.getByLabelText('Zoom out')).toBeDisabled()

		expect(screen.getByLabelText('Fit to page')).toBeDisabled()
	})
})

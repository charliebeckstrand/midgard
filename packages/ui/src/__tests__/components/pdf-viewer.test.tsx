import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { downloadPdf, printPdf } from '../../components/pdf-viewer/utilities'
import { useMinWidth } from '../../hooks'
import { allBySlot, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

vi.mock('../../hooks', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../hooks')>()

	return { ...actual, useMinWidth: vi.fn(() => true) }
})

beforeEach(() => {
	vi.mocked(useMinWidth).mockReturnValue(true)
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

	it('applies custom className', () => {
		const { container } = renderUI(<PdfViewer pages={pages} className="custom" />)

		expect(bySlot(container, 'pdf-viewer')?.className).toContain('custom')
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

	it('marks the active thumbnail with data-active', () => {
		const { container } = renderUI(<PdfViewer pages={pages} defaultPage={2} />)

		const thumbnails = allBySlot(container, 'pdf-viewer-thumbnail')

		expect(thumbnails[0]).not.toHaveAttribute('data-active')

		expect(thumbnails[1]).toHaveAttribute('data-active')
	})

	it('changes pages when a thumbnail is clicked', () => {
		const onPageChange = vi.fn()

		const { container } = renderUI(<PdfViewer pages={pages} onPageChange={onPageChange} />)

		const thumbnails = allBySlot(container, 'pdf-viewer-thumbnail')

		thumbnails[2]?.click()

		expect(onPageChange).toHaveBeenCalledWith(3)
	})

	it('shows the current page in the page selector', () => {
		const { container } = renderUI(<PdfViewer pages={pages} defaultPage={2} />)

		expect(bySlot(container, 'listbox-button')).toHaveTextContent('2')
	})

	it('disables zoom in at the maximum', () => {
		renderUI(<PdfViewer pages={pages} defaultZoom={4} maxZoom={4} />)

		expect(screen.getByLabelText('Zoom in')).toBeDisabled()
	})

	it('disables zoom out at the minimum', () => {
		renderUI(<PdfViewer pages={pages} defaultZoom={0.5} minZoom={0.5} />)

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

		screen.getByLabelText('Download').click()

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

		screen.getByLabelText('Print').click()

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
		vi.mocked(useMinWidth).mockReturnValue(false)

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
})

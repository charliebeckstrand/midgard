import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { act, attach, bySlot, present, renderUI, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of an overlay that is open in the server render. The other
 * suites mock `motion/react`, and the mock plays no entrance on a mount.
 *
 * The overlay is part of the page: it is in the server HTML, so it paints with
 * the page, and it stays at rest through hydration. A later open plays the
 * enter, and a close plays the exit.
 *
 * This project mocks `@floating-ui/react`, and the mock renders `FloatingPortal`
 * in place. `browser/floating-ui/overlay-ssr-portal.test.tsx` holds the move
 * into the real portal.
 */
const panel = () => present(bySlot(document.body, 'drawer'), '[data-slot="drawer"]')

const backdrop = () =>
	present(bySlot(document.body, 'overlay-backdrop'), '[data-slot="overlay-backdrop"]')

/** The vertical offset of the panel from its rest position, in pixels. */
const offset = () => new DOMMatrix(getComputedStyle(panel()).transform).m42

const drawer = (open: boolean, onOpenComplete?: () => void) => (
	<Drawer open={open} onOpenChange={() => {}}>
		<DrawerPanel aria-label="Restored" onOpenComplete={onOpenComplete}>
			<button type="button">inside</button>
		</DrawerPanel>
	</Drawer>
)

/** Puts the server HTML of `ui` in the document, as a load paints it before hydration. */
function serve(ui: React.ReactElement) {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(ui)

	return container
}

/** Hydrates `ui` over its server HTML, and fails on a mismatch. */
function hydrate(container: HTMLElement, ui: React.ReactElement) {
	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, ui, { onRecoverableError })
	})

	if (!root) throw new Error('expected a root')

	const hydrated = root

	onTestFinished(() => act(() => hydrated.unmount()))

	expect(onRecoverableError).not.toHaveBeenCalled()

	expect(consoleError).not.toHaveBeenCalled()

	return hydrated
}

describe('Overlay open in the server render (real Motion)', () => {
	it('paints the panel and its backdrop at rest with the server HTML', async () => {
		const container = serve(drawer(true))

		await nextPaint()

		expect(container.contains(panel())).toBe(true)

		expect(getComputedStyle(panel()).transform).toBe('none')

		expect(Number(getComputedStyle(backdrop()).opacity)).toBe(1)
	})

	it('keeps the panel at rest through hydration', async () => {
		const container = serve(drawer(true))

		hydrate(container, drawer(true))

		await nextPaint()

		expect(getComputedStyle(panel()).transform).toBe('none')

		expect(Number(getComputedStyle(backdrop()).opacity)).toBe(1)
	})

	it('plays the exit, and the enter of each later open', async () => {
		const onOpenComplete = vi.fn()

		const container = serve(drawer(true, onOpenComplete))

		const root = hydrate(container, drawer(true, onOpenComplete))

		await nextPaint()

		act(() => root.render(drawer(false, onOpenComplete)))

		await nextPaint()

		// The panel stays for its exit and slides out.
		expect(offset()).toBeGreaterThan(0)

		await waitFor(() => expect(bySlot(document.body, 'drawer')).toBeNull())

		// The restore ran no entrance, so it landed no arrival.
		expect(onOpenComplete).not.toHaveBeenCalled()

		act(() => root.render(drawer(true, onOpenComplete)))

		await nextPaint()

		expect(offset()).toBeGreaterThan(0)

		await waitFor(() => expect(onOpenComplete).toHaveBeenCalledOnce())
	})

	it('slides in a panel that mounts open on the client', async () => {
		renderUI(drawer(true))

		await nextPaint()

		expect(offset()).toBeGreaterThan(0)
	})
})

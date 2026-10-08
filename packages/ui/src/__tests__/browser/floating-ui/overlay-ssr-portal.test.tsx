import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { act, attach, bySlot, present, waitFor } from '../../helpers'
import { frame } from '../../helpers/frames'

/**
 * An overlay that is open in the server render is in the server HTML, in place.
 * Hydration moves it into the portal.
 *
 * Here because the jsdom projects and the other browser projects mock
 * `@floating-ui/react`, and that mock renders `FloatingPortal` in place. Thus
 * the move does not occur there. The real engine builds the portal node in a
 * layout effect, so the move must commit before a paint: no frame may lack the
 * panel.
 */
const panel = () => present(bySlot(document.body, 'drawer'), '[data-slot="drawer"]')

const drawer = (
	<Drawer open onOpenChange={() => {}}>
		<DrawerPanel aria-label="Restored">
			<button type="button">inside</button>
		</DrawerPanel>
	</Drawer>
)

describe('Overlay open in the server render (real floating-ui)', () => {
	it('moves the panel from the server HTML into the portal, with no frame that lacks it', async () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(drawer)

		expect(container.contains(panel())).toBe(true)

		// One sample for each frame from the server paint to the move.
		const frames: boolean[] = []

		let sampling = true

		const sample = () => {
			frames.push(bySlot(document.body, 'drawer') !== null)

			if (sampling) requestAnimationFrame(sample)
		}

		requestAnimationFrame(sample)

		const onRecoverableError = vi.fn()

		const consoleError = vi.spyOn(console, 'error')

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, drawer, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		await waitFor(() => expect(panel().closest('[data-floating-ui-portal]')).not.toBeNull())

		await frame()

		sampling = false

		expect(container.contains(panel())).toBe(false)

		expect(document.querySelectorAll('[data-slot="drawer"]')).toHaveLength(1)

		expect(frames).not.toContain(false)

		await waitFor(() => expect(panel()).toContainElement(document.activeElement as HTMLElement))
	})
})

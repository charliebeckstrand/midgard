import { describe, expect, it, vi } from 'vitest'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { bySlot, present, renderUI, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of `appear`. The other suites mock `motion/react`, and the
 * mock plays no entrance on a mount.
 *
 * A panel that mounts open with `appear={false}` is at rest at the first paint.
 * A later open plays the enter, because the closed portal unmounts its
 * `AnimatePresence` and the next open mounts a new one.
 */
const panel = () => present(bySlot(document.body, 'drawer'), '[data-slot="drawer"]')

const backdrop = () =>
	present(bySlot(document.body, 'overlay-backdrop'), '[data-slot="overlay-backdrop"]')

/** The vertical offset of the panel from its rest position, in pixels. */
const offset = () => new DOMMatrix(getComputedStyle(panel()).transform).m42

const drawer = (open: boolean, props: { appear?: boolean; onOpenComplete?: () => void }) => (
	<Drawer open={open} onOpenChange={() => {}}>
		<DrawerPanel aria-label="Restored" {...props}>
			content
		</DrawerPanel>
	</Drawer>
)

describe('Panel appear (real Motion)', () => {
	it('slides a panel in that mounts open by default', async () => {
		renderUI(drawer(true, {}))

		await nextPaint()

		expect(offset()).toBeGreaterThan(0)
	})

	it('shows a panel at rest at the first paint with appear off', async () => {
		renderUI(drawer(true, { appear: false }))

		await nextPaint()

		// At rest, not at a zero translate: the recipe's `transitionEnd` applies at once.
		expect(getComputedStyle(panel()).transform).toBe('none')

		expect(Number(getComputedStyle(backdrop()).opacity)).toBe(1)
	})

	it('plays the exit, and the enter of each later open, with appear off', async () => {
		const onOpenComplete = vi.fn()

		const props = { appear: false, onOpenComplete }

		const { rerender } = renderUI(drawer(true, props))

		await nextPaint()

		rerender(drawer(false, props))

		await nextPaint()

		// The panel stays for its exit and slides out.
		expect(offset()).toBeGreaterThan(0)

		await waitFor(() => expect(bySlot(document.body, 'drawer')).toBeNull())

		// The restore ran no entrance, so it landed no arrival.
		expect(onOpenComplete).not.toHaveBeenCalled()

		rerender(drawer(true, props))

		await nextPaint()

		expect(offset()).toBeGreaterThan(0)

		await waitFor(() => expect(onOpenComplete).toHaveBeenCalledOnce())
	})
})

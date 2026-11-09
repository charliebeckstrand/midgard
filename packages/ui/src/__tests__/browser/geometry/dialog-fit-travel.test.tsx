import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogBody, type DialogHeight, DialogPanel } from '../../../components/dialog'
import { frames, getSlot, renderUI, screen, waitFor } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { hasIntermediate, sampleTravel } from '../helpers/sample'

/**
 * Real-browser probe of the height of a `fit` dialog. The panel takes the
 * height of its content and travels between two of those heights. jsdom lays
 * nothing out, so these cases sample the border box of the panel across
 * frames, as `drawer-fit-travel` does for the Drawer.
 */

/** A dialog whose one content block swaps between two heights. */
function FitProbe({
	align,
	height,
	short,
	tall,
}: {
	align: 'bottom' | 'center'
	height: DialogHeight
	short: number
	tall: number
}) {
	const [grown, setGrown] = useState(false)

	return (
		<>
			<button type="button" data-testid="swap" onClick={() => setGrown(true)}>
				swap
			</button>

			<Dialog open onOpenChange={() => {}}>
				<DialogPanel align={align} height={height} footer={null} aria-label="Probe">
					<DialogBody>
						<div style={{ height: grown ? tall : short }} />
					</DialogBody>
				</DialogPanel>
			</Dialog>
		</>
	)
}

describe('fit dialog height (real browser)', () => {
	it.each(['bottom', 'center'] as const)(
		'travels to the next height of its content (%s)',
		async (align) => {
			renderUI(<FitProbe align={align} height="fit" short={120} tall={320} />)

			const panel = getSlot(document.body, 'dialog')

			const short = panel.getBoundingClientRect().height

			expect(short).toBeGreaterThan(120)

			// The panel takes its baseline from the first delivery of the observer.
			await frames()

			screen.getByTestId('swap').click()

			const samples = await sampleTravel(panel, short, short + 200)

			// The panel goes through the heights between, and does not show the new
			// height in the first frame.
			expect(hasIntermediate(samples, short, short + 200)).toBe(true)

			await waitFor(() =>
				expect(panel.getBoundingClientRect().height - short).toBeNear(200, HALF_PIXEL),
			)

			// On arrival, the height goes back to the layout.
			await waitFor(() => expect(panel.style.height).toBe(''))
		},
	)

	it('changes the height of an auto dialog in one step', async () => {
		renderUI(<FitProbe align="center" height="auto" short={120} tall={320} />)

		const panel = getSlot(document.body, 'dialog')

		const short = panel.getBoundingClientRect().height

		await frames()

		screen.getByTestId('swap').click()

		await frames()

		expect(panel.getBoundingClientRect().height - short).toBeNear(200, HALF_PIXEL)

		expect(panel.style.height).toBe('')
	})

	it('stops at the cap of a centered panel, 1rem short of each edge', async () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel align="center" height="fit" footer={null} aria-label="Tall">
					<DialogBody>
						<div style={{ height: window.innerHeight + 400 }} />
					</DialogBody>
				</DialogPanel>
			</Dialog>,
		)

		const panel = getSlot(document.body, 'dialog')

		expect(panel.getBoundingClientRect().height).toBeNear(window.innerHeight - 32, HALF_PIXEL)

		// The panel stands at its cap, and the fit reads the same cap.
		await waitFor(() => expect(panel).toHaveAttribute('data-full'))
	})
})

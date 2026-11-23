import { describe, expect, it } from 'vitest'
import { TooltipPointer } from '../../components/tooltip/tooltip-pointer'
import { act, bySlot, fireEvent, renderUI, waitFor } from '../helpers'

/** A readout at a fixed client point, open while `open` is true. */
function readout(open: boolean) {
	return (
		<TooltipPointer open={open} point={{ x: 40, y: 40 }} track="point">
			<span>Readout</span>
		</TooltipPointer>
	)
}

/**
 * The chart, heatmap, and map readouts follow the pointer, and the focus can
 * be anywhere on the page. Escape closes the readout without a pointer move
 * (WCAG 1.4.13), as it closes a `Tooltip`. The readout stays closed until the
 * hover ends, and the next hover opens it again.
 */
describe('TooltipPointer Escape', () => {
	it('closes on Escape while the focus is outside the readout, and opens on the next hover', async () => {
		const { rerender } = renderUI(readout(true))

		await waitFor(() => expect(bySlot(document.body, 'tooltip-content')).not.toBeNull())

		fireEvent.keyDown(document.body, { key: 'Escape' })

		await waitFor(() => expect(bySlot(document.body, 'tooltip-content')).toBeNull())

		// The hover goes on, so the readout stays closed.
		await act(async () => rerender(readout(true)))

		expect(bySlot(document.body, 'tooltip-content')).toBeNull()

		// The hover ends, then starts again.
		await act(async () => rerender(readout(false)))

		await act(async () => rerender(readout(true)))

		await waitFor(() => expect(bySlot(document.body, 'tooltip-content')).not.toBeNull())
	})

	it('leaves an Escape that a consumer handled', async () => {
		renderUI(readout(true))

		await waitFor(() => expect(bySlot(document.body, 'tooltip-content')).not.toBeNull())

		const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

		event.preventDefault()

		act(() => {
			document.body.dispatchEvent(event)
		})

		expect(bySlot(document.body, 'tooltip-content')).not.toBeNull()
	})
})

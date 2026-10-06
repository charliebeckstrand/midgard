import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ColorPicker } from '../../components/color'
import { getSlot, renderUI, waitFor } from '../helpers'

/**
 * Where a press in an open ColorPicker puts the focus.
 *
 * The content of the picker cancelled each mousedown, so that a drag on the area or on a slider
 * track kept the focus that the drag gives. That hold also caught each part that did not stop the
 * press: the copy button, the swatch chips, and the padding. A press there left the focus on the
 * control before it, such as an edited hex field. Now only the area and the tracks hold the press.
 *
 * The file runs in the real browser, because jsdom does not move the focus on a press.
 */
describe('the focus after a press in an open ColorPicker (real browser)', () => {
	async function openPicker() {
		vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

		const { container } = renderUI(<ColorPicker defaultValue="#3b82f6" />)

		await userEvent.click(getSlot(container, 'color-picker-button'))

		const content = await waitFor(() => getSlot(document.body, 'color-picker-content'))

		// Start each case from the hex field, the control that the hold kept the focus on.
		await userEvent.click(getSlot(content, 'color-hex-input'))

		expect(document.activeElement).toBe(getSlot(content, 'color-hex-input'))

		return content
	}

	it('moves the focus to the copy button that the press lands on', async () => {
		const content = await openPicker()

		const copy = getSlot(content, 'copy-button')

		await userEvent.click(copy)

		expect(document.activeElement).toBe(copy)
	})

	it('moves the focus off the hex field on a press of the padding', async () => {
		const content = await openPicker()

		await userEvent.click(content, { position: { x: 2, y: 2 } })

		expect(document.activeElement).not.toBe(getSlot(content, 'color-hex-input'))
	})

	it('keeps the focus that a drag gives on the area and on a slider track', async () => {
		const content = await openPicker()

		const area = getSlot(content, 'color-area')

		await userEvent.click(area)

		expect(document.activeElement).toBe(area)

		const slider = getSlot(content, 'color-slider')

		await userEvent.click(slider)

		expect(slider.contains(document.activeElement)).toBe(true)
	})
})

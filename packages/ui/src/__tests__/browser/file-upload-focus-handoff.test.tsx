import { describe, expect, it } from 'vitest'
import { FileUploadDrop } from '../../components/file-upload'
import { getSlot, present, renderUI, userEvent, waitFor } from '../helpers'

/**
 * The drop zone swaps its focused control when a selection lands or clears. A
 * real browser moves focus to the body when it removes the focused node, so
 * this runs in the browser suite. The test feeds the hidden input as the native
 * picker does, because a test cannot drive the picker.
 */
describe('FileUploadDrop focus handoff (real browser)', () => {
	it('keeps keyboard focus in the zone across a pick and a Reset', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<FileUploadDrop />)

		await user.tab()

		expect(document.activeElement).toBe(getSlot(container, 'file-upload'))

		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		const transfer = new DataTransfer()

		transfer.items.add(new File(['x'], 'resume.pdf'))

		input.files = transfer.files

		input.dispatchEvent(new Event('change', { bubbles: true }))

		await waitFor(() =>
			expect(document.activeElement?.getAttribute('aria-label')).toBe('Choose a different file'),
		)

		await user.tab()

		expect(document.activeElement?.textContent).toBe('Reset')

		await user.keyboard('{Enter}')

		await waitFor(() => expect(document.activeElement).toBe(getSlot(container, 'file-upload')))
	})
})

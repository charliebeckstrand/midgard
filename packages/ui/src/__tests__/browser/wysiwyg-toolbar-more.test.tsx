import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { getSlot, renderUI, screen, waitFor, within } from '../helpers'
import { editable } from './helpers/wysiwyg'

/**
 * The Wysiwyg toolbar is one row. On a narrow field, the groups that the row
 * cannot hold wait behind More, and a press on More shows them after Back. The
 * toolbar keeps its size on each page, so the field does not move, and a press
 * keeps the focus in the field, so the virtual keyboard stays open. A press on
 * an action of the page runs it and keeps the page.
 *
 * Rides the real browser because jsdom lays nothing out, and its press does
 * not move the focus as a browser does. It also runs in WebKit, the engine of
 * iOS Safari.
 */
describe('Wysiwyg toolbar More (real browser)', () => {
	function renderField(width: number) {
		return renderUI(
			<div style={{ width }}>
				<Wysiwyg aria-label="Notes" defaultValue="Text">
					<WysiwygToolbar />
				</Wysiwyg>
			</div>,
		)
	}

	function getRow(): HTMLElement {
		return screen.getByRole('toolbar', { name: 'Formatting' })
	}

	function getMore(row: HTMLElement): HTMLElement {
		const more = row.querySelector<HTMLElement>('[data-slot="toolbar-more"] > button')

		if (!more) throw new Error('No More button')

		return more
	}

	it('shows each group on one row with no More on a wide field', async () => {
		renderField(800)

		const row = getRow()

		const one = within(row).getByRole('button', { name: 'Bold' }).getBoundingClientRect()

		expect(row.getBoundingClientRect().height).toBe(one.height)

		await waitFor(() => expect(getMore(row).closest('[inert]')).not.toBeNull())

		expect(within(row).getByRole('button', { name: 'Code block' })).toBeVisible()
	})

	it('keeps one row, and shows the rest after More with the focus in the field', async () => {
		const { container } = renderField(320)

		const field = await editable()

		const toolbar = getSlot(container, 'wysiwyg-toolbar')

		const before = toolbar.getBoundingClientRect().height

		const row = getRow()

		const bold = within(row).getByRole('button', { name: 'Bold' })

		expect(row.getBoundingClientRect().height).toBe(bold.getBoundingClientRect().height)

		// The code group waits below the clip, inert.
		await waitFor(() =>
			expect(within(row).getByRole('button', { name: 'Code' }).closest('[inert]')).not.toBeNull(),
		)

		expect(getMore(row).closest('[inert]')).toBeNull()

		await userEvent.click(getMore(row))

		const back = await within(row).findByRole('button', { name: 'Back' })

		expect(field).toHaveFocus()

		expect(toolbar.getBoundingClientRect().height).toBe(before)

		await userEvent.click(within(row).getByRole('button', { name: 'Code' }))

		await waitFor(() => expect(within(row).getByRole('button', { name: 'Code' })).toBePressed())

		expect(field).toHaveFocus()

		expect(back).toBeVisible()

		// The Tab stop of the row is on the page, and not on a hidden group.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		const stop = document.activeElement

		expect(row.contains(stop)).toBe(true)

		expect(stop?.closest('[inert]')).toBeNull()

		await userEvent.keyboard('{Tab}')

		expect(field).toHaveFocus()

		await userEvent.click(back)

		await waitFor(() => expect(within(row).queryByRole('button', { name: 'Back' })).toBeNull())

		expect(within(row).getByRole('button', { name: 'Bold' })).toBeVisible()

		expect(toolbar.getBoundingClientRect().height).toBe(before)

		expect(field).toHaveFocus()
	})
})

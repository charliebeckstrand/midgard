import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { AppearanceProvider, AppearanceSettings } from '../../providers/appearance'
import { GlassSurfacesContext } from '../../providers/glass/context'
import { renderUI, screen, within } from '../helpers'

/**
 * The fill of a popover inside a glass panel (real paint). The glass panel has
 * a `backdrop-filter`, and the blur of a popover inside it then has nothing to
 * blur. Thus the popover takes an opaque fill there, or the fields behind it
 * show through. jsdom compiles no Tailwind, so only a real browser reads the
 * fill back off the panel.
 */
describe('Popover fill in a glass panel (real browser)', () => {
	/** Alpha of the painted background of `element`, 1 when the color has no alpha. */
	function readAlpha(element: Element): number {
		const painted = getComputedStyle(element).backgroundColor

		const alpha =
			painted.match(/\/\s*([\d.]+)\s*\)$/) ?? painted.match(/rgba\([^)]*,\s*([\d.]+)\)$/)

		return alpha ? Number(alpha[1]) : 1
	}

	/** Opens the Settings dialog on the given surface, then the Appearance picker, and gives its listbox. */
	async function openPicker(glass: boolean): Promise<HTMLElement> {
		renderUI(
			<AppearanceProvider>
				<GlassSurfacesContext value={glass}>
					<AppearanceSettings />
				</GlassSurfacesContext>
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		const dialog = await screen.findByRole('dialog', { name: 'Settings' })

		await userEvent.click(within(dialog).getAllByRole('combobox')[0] as HTMLElement)

		return within(dialog).findByRole('listbox')
	}

	it('paints the listbox of a glass Settings dialog opaque', async () => {
		const listbox = await openPicker(true)

		expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('data-glass', '')

		expect(readAlpha(listbox)).toBe(1)
	})

	it('keeps the translucent popover fill in a flat Settings dialog', async () => {
		const listbox = await openPicker(false)

		expect(readAlpha(listbox)).toBeLessThan(1)
	})
})

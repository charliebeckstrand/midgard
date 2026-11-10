import { describe, expect, it } from 'vitest'
import { CommandPalette, CommandPaletteItem } from '../../../components/command-palette'
import { getSlot, noop, present, renderUI } from '../../helpers'

/**
 * Command palette empty space (real layout). While the listbox holds no
 * result, the body of the list and the empty status take no part in the
 * layout. The footer then sits one gap of the panel below the search input,
 * and not two. jsdom lays nothing out, so only a real browser can measure it.
 */
describe('Command palette empty space (real browser)', () => {
	it('puts one gap of the panel between the search input and the footer', () => {
		renderUI(
			<CommandPalette open onOpenChange={noop}>
				{null}
			</CommandPalette>,
		)

		const input = getSlot(document.body, 'command-palette-input')

		const frame = present(input.closest('[data-slot=control-frame]'), 'the frame of the input')

		const panel = present(input.closest('[role=dialog]'), 'the panel')

		const footer = getSlot(document.body, 'command-palette-footer')

		const gap = Number.parseFloat(getComputedStyle(panel).rowGap)

		expect(gap).toBeGreaterThan(0)

		expect(footer.getBoundingClientRect().top - frame.getBoundingClientRect().bottom).toBe(gap)
	})

	// The rows of a search come after the palette opens on an empty list. The
	// body must show them, and hide again when they go.
	it('shows the body when the first rows come, and hides it when they go', () => {
		const palette = (rows: string[]) => (
			<CommandPalette open onOpenChange={noop}>
				{rows.map((row) => (
					<CommandPaletteItem key={row}>{row}</CommandPaletteItem>
				))}
			</CommandPalette>
		)

		const { rerender } = renderUI(palette([]))

		const body = getSlot(document.body, 'dialog-body')

		expect(getComputedStyle(body).display).toBe('none')

		rerender(palette(['Georgia', 'Texas']))

		expect(getComputedStyle(body).display).not.toBe('none')

		expect(body.getBoundingClientRect().height).toBeGreaterThan(0)

		rerender(palette([]))

		expect(getComputedStyle(body).display).toBe('none')
	})
})

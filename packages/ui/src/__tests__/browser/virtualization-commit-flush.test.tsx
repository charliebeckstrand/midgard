import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { VirtualOptions } from '../../primitives/virtual-options'
import { present, renderUI, screen, waitFor } from '../helpers'

/**
 * A row of the measured window that attaches in a commit and changes the
 * scroll offset (real browser). The measurement asks for a synchronous render.
 * React cannot flush inside its own commit, and it warns when `flushSync` is
 * called there. The render must land in the same commit with no warning.
 */

const COUNT = 200

const ITEMS = Array.from({ length: COUNT }, (_, index) => ({ id: index, label: `item-${index}` }))

describe('the measured window in a commit', () => {
	it('measures rows that attach with no flushSync warning', async () => {
		const error = vi.spyOn(console, 'error')

		renderUI(
			<Combobox<number> aria-label="Pick" size="xl" displayValue={(value) => `item-${value}`}>
				<VirtualOptions items={ITEMS} getOptionId={(item) => `opt-${item.id}`}>
					{(item, _index, meta) => (
						<ComboboxOption key={item.id} id={`opt-${item.id}`} value={item.id} {...meta}>
							<ComboboxLabel>{item.label}</ComboboxLabel>
						</ComboboxOption>
					)}
				</VirtualOptions>
			</Combobox>,
		)

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))

		// At `xl` a row is taller than its estimate. ArrowUp from no highlight
		// wraps to the last option. Each later step attaches a row above the
		// viewport, which measures and moves the offset.
		for (let step = 0; step < 30; step++) await userEvent.keyboard('{ArrowUp}')

		await waitFor(() =>
			expect(input.getAttribute('aria-activedescendant')).toBe(`opt-${COUNT - 30}`),
		)

		present(document.getElementById(`opt-${COUNT - 30}`), `option ${COUNT - 30}`)

		const warnings = error.mock.calls.filter(([message]) =>
			String(message).includes('flushSync was called'),
		)

		expect(warnings).toEqual([])
	})
})

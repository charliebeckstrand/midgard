import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { VirtualOptions } from '../../../primitives/virtual-options'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'
import { budget } from '../helpers/wall-clock'

/**
 * Listbox with `VirtualOptions` and `getOptionId` (real browser). The arrow
 * keys and type-ahead reach an option outside the rendered window, as they do
 * in Combobox and CommandPalette. The `PopoverPanel` of the Listbox takes the
 * item source and moves real focus to the target row when it mounts.
 */
const COUNT = 5_000

const ITEMS = Array.from({ length: COUNT }, (_, i) => ({ id: i, label: `item-${i}` }))

function LargeListbox() {
	return (
		<Listbox<number> placeholder="Pick" aria-label="Pick">
			<VirtualOptions
				items={ITEMS}
				getOptionId={(item) => `lb-opt-${item.id}`}
				getTextValue={(item) => item.label}
			>
				{(item, _index, meta) => (
					<ListboxOption key={item.id} id={`lb-opt-${item.id}`} value={item.id} {...meta}>
						<ListboxLabel>{item.label}</ListboxLabel>
					</ListboxOption>
				)}
			</VirtualOptions>
		</Listbox>
	)
}

describe('Listbox + VirtualOptions: keys reach options outside the window', () => {
	it('End reaches the last of 5,000 options', async () => {
		renderUI(<LargeListbox />)

		await userEvent.click(screen.getByRole('combobox'))

		await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(1))

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('option'))

		expect(document.getElementById(`lb-opt-${COUNT - 1}`)).toBeNull()

		await userEvent.keyboard('{End}')

		await waitFor(() => expect(document.activeElement?.id).toBe(`lb-opt-${COUNT - 1}`), {
			timeout: budget(1500),
		})
	})

	it('type-ahead reaches an option outside the window', async () => {
		renderUI(<LargeListbox />)

		await userEvent.click(screen.getByRole('combobox'))

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('option'))

		expect(document.getElementById('lb-opt-499')).toBeNull()

		// The type-ahead buffer resets after 500 ms with no key. Under load, one real
		// key press can take longer than that, and the query then starts again in the
		// middle. The keys go out in one task, so no timer can run between two of them.
		for (const key of 'item-499') {
			fireEvent.keyDown(document.activeElement ?? document.body, { key })
		}

		await waitFor(() => expect(document.activeElement?.id).toBe('lb-opt-499'), {
			timeout: budget(1500),
		})
	})
})

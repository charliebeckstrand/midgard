import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { Listbox, ListboxOption } from '../../components/listbox'
import { useDensity } from '../../primitives/density'
import { act, fireEvent, getSlot, renderUI, screen, userEvent } from '../helpers'

/**
 * A multi-select toggle renders only the option that changes.
 *
 * Each option row is a memoized `BaseOption`, and each takes the `onSelect` of
 * its host. That handler depended on the `commit` of `useDeferredToggle`, which
 * took a new identity on each change of the value. One toggle therefore
 * rendered all the rows.
 *
 * The count reads `useDensity`, which each row calls when it renders. A toggle
 * calls it from the toggled row and from the few parts of the host that show
 * the value. The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../primitives/density', async (importActual) => {
	const actual = await importActual<typeof import('../../primitives/density')>()

	return { ...actual, useDensity: vi.fn(actual.useDensity) }
})

const VALUES = Array.from({ length: 100 }, (_, index) => `v${index}`)

/** The most `useDensity` calls a toggle can make without a render of each row. */
const BOUND = 10

/** Toggles two options, then counts the renders of the second toggle only. */
function secondToggle(options: HTMLElement[]) {
	act(() => {
		fireEvent.click(options[5] as HTMLElement)
	})

	vi.mocked(useDensity).mockClear()

	act(() => {
		fireEvent.click(options[9] as HTMLElement)
	})

	return vi.mocked(useDensity).mock.calls.length
}

describe('multi-select option renders', () => {
	beforeEach(() => {
		vi.mocked(useDensity).mockClear()
	})

	it('renders only the toggled option of a listbox', () => {
		const { container } = renderUI(
			<Listbox multiple>
				{VALUES.map((value) => (
					<ListboxOption key={value} value={value}>
						{value}
					</ListboxOption>
				))}
			</Listbox>,
		)

		act(() => {
			fireEvent.click(getSlot(container, 'listbox-button'))
		})

		const options = screen.getAllByRole('option')

		expect(options).toHaveLength(VALUES.length)

		expect(secondToggle(options)).toBeLessThanOrEqual(BOUND)
	})

	it('renders only the toggled option of a combobox', async () => {
		renderUI(
			<Combobox<string> multiple>
				{VALUES.map((value) => (
					<ComboboxOption key={value} value={value}>
						{value}
					</ComboboxOption>
				))}
			</Combobox>,
		)

		await userEvent.setup({ delay: null }).click(screen.getByRole('combobox'))

		const options = screen.getAllByRole('option')

		expect(options).toHaveLength(VALUES.length)

		expect(secondToggle(options)).toBeLessThanOrEqual(BOUND)
	})
})

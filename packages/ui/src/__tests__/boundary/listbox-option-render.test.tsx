import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { Listbox, ListboxOption } from '../../components/listbox'
import { act, fireEvent, getSlot, renderUI, screen, userEvent } from '../helpers'

/**
 * A multi-select toggle renders only the option that changes.
 *
 * Each option row is a memoized `Option`, and each takes the `onSelect` of
 * its host. That handler depended on the `commit` of `useDeferredToggle`, which
 * took a new identity on each change of the value. One toggle therefore
 * rendered all the rows.
 *
 * The count reads the `useId` calls of `OptionImpl`, which each row makes when
 * it renders. A hook runs on each render, also when the React Compiler
 * memoizes the body. The count needs a module mock, so this suite sits in
 * `boundary/`.
 */
/** The call stack of each `useId` call since the last clear. */
const stacks = vi.hoisted((): string[] => [])

vi.mock('react', async (importActual) => {
	const actual = await importActual<typeof import('react')>()

	return {
		...actual,
		useId: () => {
			stacks.push(new Error().stack ?? '')

			return actual.useId()
		},
	}
})

const VALUES = Array.from({ length: 100 }, (_, index) => `v${index}`)

/** The most row renders a toggle can make without a render of each row. */
const BOUND = 2

/** The renders of an option row since the last clear. */
function optionRenders() {
	return stacks.filter((stack) => stack.includes('OptionImpl')).length
}

/** Toggles two options, then counts the row renders of the second toggle only. */
function secondToggle(options: HTMLElement[]) {
	act(() => {
		fireEvent.click(options[5] as HTMLElement)
	})

	stacks.length = 0

	act(() => {
		fireEvent.click(options[9] as HTMLElement)
	})

	return optionRenders()
}

describe('multi-select option renders', () => {
	beforeEach(() => {
		stacks.length = 0
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

		// The count is live: each row rendered when the panel opened.
		expect(optionRenders()).toBeGreaterThanOrEqual(VALUES.length)

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

		expect(optionRenders()).toBeGreaterThanOrEqual(VALUES.length)

		expect(secondToggle(options)).toBeLessThanOrEqual(BOUND)
	})
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxDeferredQuery,
} from '../../components/combobox'
import { CommandPalette, useCommandPaletteDeferredQuery } from '../../components/command-palette'
import { CommandPaletteItem } from '../../components/command-palette/command-palette-item'
import { act, renderUI, screen, userEvent } from '../helpers'
import { clearOptionRenders, optionRenders } from '../helpers/option-renders'

/**
 * One keystroke renders one pass of the options that a consumer filters.
 *
 * The query context held the live query and the deferred query together. A
 * consumer that filtered on the deferred query therefore rendered on the pass
 * of the live query and again on the deferred pass, and so did each option. A
 * consumer of the deferred query now reads a context that holds only the
 * deferred query.
 *
 * The combobox count reads the `useId` calls of `OptionImpl`, which each option
 * makes when it renders. A hook runs on each render, also when the React
 * Compiler memoizes the body. The command palette count reads the calls of
 * `CommandPaletteItem`. The counts need module mocks, so this suite sits in
 * `boundary/`.
 */
vi.mock('react', async (importActual) => {
	const { withRecordedUseId } = await import('../helpers/option-renders')

	return withRecordedUseId(await importActual<typeof import('react')>())
})

vi.mock('../../components/command-palette/command-palette-item', async (importActual) => {
	const actual =
		await importActual<typeof import('../../components/command-palette/command-palette-item')>()

	return { ...actual, CommandPaletteItem: vi.fn(actual.CommandPaletteItem) }
})

const VALUES = Array.from({ length: 50 }, (_, index) => `v${index}`)

function ComboboxResults() {
	const deferredQuery = useComboboxDeferredQuery()

	return VALUES.filter((value) => value.startsWith(deferredQuery)).map((value) => (
		<ComboboxOption key={value} value={value}>
			<ComboboxLabel>{value}</ComboboxLabel>
		</ComboboxOption>
	))
}

function PaletteResults() {
	const deferredQuery = useCommandPaletteDeferredQuery()

	return VALUES.filter((value) => value.startsWith(deferredQuery)).map((value) => (
		<CommandPaletteItem key={value} value={value}>
			{value}
		</CommandPaletteItem>
	))
}

describe('query option renders', () => {
	beforeEach(() => {
		clearOptionRenders()

		vi.mocked(CommandPaletteItem).mockClear()
	})

	it('renders each combobox option once for a keystroke', async () => {
		renderUI(
			<Combobox<string> aria-label="Values">
				<ComboboxResults />
			</Combobox>,
		)

		const user = userEvent.setup({ delay: null })

		await user.click(screen.getByRole('combobox'))

		expect(screen.getAllByRole('option')).toHaveLength(VALUES.length)

		// The count is live: each option rendered when the panel opened.
		expect(optionRenders()).toBeGreaterThanOrEqual(VALUES.length)

		clearOptionRenders()

		await act(async () => {
			await user.keyboard('v')
		})

		expect(screen.getAllByRole('option')).toHaveLength(VALUES.length)

		expect(optionRenders()).toBeLessThanOrEqual(VALUES.length)
	})

	it('renders each command palette item once for a keystroke', async () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<PaletteResults />
			</CommandPalette>,
		)

		const user = userEvent.setup({ delay: null })

		await user.click(screen.getByRole('combobox'))

		// The count is live: each item rendered when the palette opened.
		expect(vi.mocked(CommandPaletteItem).mock.calls.length).toBeGreaterThanOrEqual(VALUES.length)

		vi.mocked(CommandPaletteItem).mockClear()

		await act(async () => {
			await user.keyboard('v')
		})

		expect(screen.getAllByRole('option')).toHaveLength(VALUES.length)

		expect(vi.mocked(CommandPaletteItem).mock.calls.length).toBeLessThanOrEqual(VALUES.length)
	})
})

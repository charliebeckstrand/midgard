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

/**
 * One keystroke renders one pass of the options that a consumer filters.
 *
 * The query context held the live query and the deferred query together. A
 * consumer that filtered on the deferred query therefore rendered on the pass
 * of the live query and again on the deferred pass, and so did each option. A
 * consumer of the deferred query now reads a context that holds only the
 * deferred query.
 *
 * The combobox count reads the `useDensity` calls of `BaseOptionImpl`, which
 * each option makes when it renders. The command palette count reads the calls
 * of `CommandPaletteItem`. The counts need module mocks, so this suite sits in
 * `boundary/`.
 */
/** The call stack of each `useDensity` call since the last clear. */
const stacks = vi.hoisted((): string[] => [])

vi.mock('../../primitives/density', async (importActual) => {
	const actual = await importActual<typeof import('../../primitives/density')>()

	return {
		...actual,
		useDensity: vi.fn(() => {
			stacks.push(new Error().stack ?? '')

			return actual.useDensity()
		}),
	}
})

vi.mock('../../components/command-palette/command-palette-item', async (importActual) => {
	const actual =
		await importActual<typeof import('../../components/command-palette/command-palette-item')>()

	return { ...actual, CommandPaletteItem: vi.fn(actual.CommandPaletteItem) }
})

const VALUES = Array.from({ length: 50 }, (_, index) => `v${index}`)

/** The `useDensity` calls that came from a render of an option. */
function optionRenders() {
	return stacks.filter((stack) => stack.includes('BaseOptionImpl')).length
}

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
		stacks.length = 0

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

		stacks.length = 0

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

		vi.mocked(CommandPaletteItem).mockClear()

		await act(async () => {
			await user.keyboard('v')
		})

		expect(screen.getAllByRole('option')).toHaveLength(VALUES.length)

		expect(vi.mocked(CommandPaletteItem).mock.calls.length).toBeLessThanOrEqual(VALUES.length)
	})
})

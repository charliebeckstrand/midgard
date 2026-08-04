import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Combobox,
	ComboboxCreateOption,
	ComboboxLabel,
	ComboboxOption,
	useComboboxQuery,
} from '../../components/combobox'
import { renderUI, screen, userEvent } from '../helpers'

const NAMES = ['Texas LTL', 'Georgia TL']

/** The consumer-driven filter half of the panel, as every combobox writes it. */
function MatchingNames() {
	const { deferredQuery } = useComboboxQuery()

	return NAMES.filter(
		(name) => !deferredQuery || name.toLowerCase().includes(deferredQuery.toLowerCase()),
	).map((name) => (
		<ComboboxOption key={name} value={name}>
			<ComboboxLabel>{name}</ComboboxLabel>
		</ComboboxOption>
	))
}

function renderCreatable(props: { onValueChange?: (value: string | null) => void } = {}) {
	function Host() {
		const [value, setValue] = useState<string | null>(null)

		return (
			<Combobox<string>
				value={value}
				onValueChange={(next) => {
					setValue(next)
					props.onValueChange?.(next)
				}}
				displayValue={(v) => v}
				aria-label="Name"
			>
				<MatchingNames />
				<ComboboxCreateOption taken={NAMES} />
			</Combobox>
		)
	}

	return renderUI(<Host />)
}

describe('ComboboxCreateOption', () => {
	it('renders nothing while the query is blank', async () => {
		const user = userEvent.setup({ delay: null })

		renderCreatable()

		await user.click(screen.getByRole('combobox'))

		// Both existing names, and no create row to choose between them.
		expect(screen.getAllByRole('option')).toHaveLength(2)

		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('offers to create the typed name beside the partial matches', async () => {
		const user = userEvent.setup({ delay: null })

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Tex')

		// The match still answers the query first; creating is what is left when it
		// isn't the one wanted.
		expect(screen.getByText('Texas LTL')).toBeInTheDocument()

		expect(screen.getByText('Create “Tex”')).toBeInTheDocument()
	})

	it('withdraws when the query names an option that already exists', async () => {
		const user = userEvent.setup({ delay: null })

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Texas LTL')

		expect(screen.getByText('Texas LTL')).toBeInTheDocument()

		// Nothing to create — that name is taken, so the existing row is the answer.
		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('folds case and surrounding space when testing whether a name is taken', async () => {
		const user = userEvent.setup({ delay: null })

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('  texas ltl  ')

		// Two spellings of one name are one name to a reader, so offering to create the
		// second would invite a duplicate nobody could tell apart.
		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('selects the trimmed query, as an ordinary option selection', async () => {
		const user = userEvent.setup({ delay: null })

		const onValueChange = vi.fn()

		renderCreatable({ onValueChange })

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('  Lee carriers  ')

		await user.click(screen.getByText('Create “Lee carriers”'))

		expect(onValueChange).toHaveBeenCalledWith('Lee carriers')

		// Selected like any option: the panel closes and the input shows the value.
		expect(screen.queryByRole('listbox')).toBeNull()

		expect(screen.getByRole('combobox')).toHaveValue('Lee carriers')
	})

	it('commits on Enter when it is the only row left', async () => {
		const user = userEvent.setup({ delay: null })

		const onValueChange = vi.fn()

		renderCreatable({ onValueChange })

		await user.click(screen.getByRole('combobox'))

		// Matches nothing, so the create row stands alone.
		await user.keyboard('Zephyr')

		expect(screen.getAllByRole('option')).toHaveLength(1)

		await user.keyboard('{Enter}')

		// No deliberate arrow-down first — the sole-option convenience covers the common
		// case of naming something new.
		expect(onValueChange).toHaveBeenCalledWith('Zephyr')
	})

	it('takes a custom label, given the trimmed name', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(
			<Combobox<string> displayValue={(v) => v} aria-label="Name">
				<ComboboxCreateOption taken={NAMES}>{(name) => `Save as “${name}”`}</ComboboxCreateOption>
			</Combobox>,
		)

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Lee')

		expect(screen.getByText('Save as “Lee”')).toBeInTheDocument()
	})
})

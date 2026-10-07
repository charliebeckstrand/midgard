import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Combobox,
	ComboboxCreateOption,
	type ComboboxCreateOptionProps,
	ComboboxLabel,
	ComboboxOption,
} from '../../components/combobox'
import { ComboboxContext } from '../../components/combobox/context'
import { useComboboxQuery } from '../../components/combobox/use-combobox-query'
import { DeferredQueryContext, QueryContext } from '../../primitives/query'
import { fireEvent, renderUI, screen, setupUser } from '../helpers'

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

/**
 * Renders the create row alone, under the contexts that Combobox gives. A live
 * query ahead of the deferred query stands for the render between the urgent
 * commit and the deferred commit.
 */
function renderRow(query: string, deferredQuery: string, props: ComboboxCreateOptionProps = {}) {
	const onSelect = vi.fn()

	renderUI(
		<ComboboxContext value={{ value: undefined, multiple: false, onSelect, capitalize: false }}>
			<QueryContext value={{ query, deferredQuery }}>
				<DeferredQueryContext value={deferredQuery}>
					<ComboboxCreateOption taken={NAMES} {...props} />
				</DeferredQueryContext>
			</QueryContext>
		</ComboboxContext>,
	)

	return onSelect
}

describe('ComboboxCreateOption', () => {
	it('renders nothing while the query is blank', async () => {
		const user = setupUser()

		renderCreatable()

		await user.click(screen.getByRole('combobox'))

		// Both existing names, and no create row to choose between them.
		expect(screen.getAllByRole('option')).toHaveLength(2)

		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('offers to create the typed name beside the partial matches', async () => {
		const user = setupUser()

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Tex')

		// The match still answers the query first; creating is what is left when it
		// isn't the one wanted.
		expect(screen.getByText('Texas LTL')).toBeInTheDocument()

		expect(screen.getByText('Create “Tex”')).toBeInTheDocument()
	})

	it('withdraws when the query names an option that already exists', async () => {
		const user = setupUser()

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Texas LTL')

		expect(screen.getByText('Texas LTL')).toBeInTheDocument()

		// Nothing to create — that name is taken, so the existing row is the answer.
		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('folds case and surrounding space when testing whether a name is taken', async () => {
		const user = setupUser()

		renderCreatable()

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('  texas ltl  ')

		// Two spellings of one name are one name to a reader, so offering to create the
		// second would invite a duplicate nobody could tell apart.
		expect(screen.queryByText(/^Create/)).toBeNull()
	})

	it('selects the trimmed query, as an ordinary option selection', async () => {
		const user = setupUser()

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
		const user = setupUser()

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
		const user = setupUser()

		renderUI(
			<Combobox<string> displayValue={(v) => v} aria-label="Name">
				<ComboboxCreateOption taken={NAMES}>{(name) => `Save as “${name}”`}</ComboboxCreateOption>
			</Combobox>,
		)

		await user.click(screen.getByRole('combobox'))
		await user.keyboard('Lee')

		expect(screen.getByText('Save as “Lee”')).toBeInTheDocument()
	})

	it('takes an explicit id, as the getOptionId of VirtualOptions needs', () => {
		renderRow('Lee', 'Lee', { id: 'create-row' })

		expect(screen.getByRole('option')).toHaveAttribute('id', 'create-row')
	})

	describe('while the deferred query lags', () => {
		it('commits the live query, trimmed', () => {
			const onSelect = renderRow('  Berlin  ', 'Berli')

			// The label follows the deferred query, so it can trail the value by one render.
			expect(screen.getByRole('option')).toHaveTextContent('Create “Berli”')

			fireEvent.click(screen.getByRole('option'))

			expect(onSelect).toHaveBeenCalledWith('Berlin')
		})

		it('renders nothing while the live query is blank', () => {
			renderRow('   ', 'Berli')

			expect(screen.queryByRole('option')).toBeNull()
		})

		it('renders nothing while the live query names a taken option', () => {
			renderRow('texas ltl', 'texas lt')

			expect(screen.queryByRole('option')).toBeNull()
		})
	})
})

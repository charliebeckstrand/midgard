/**
 * Combobox mounts its options behind an `open` gate, so the closed rungs
 * measure the trigger and the query plumbing alone — what a page pays for a
 * combobox nobody has touched — and the open rungs add the rendered options.
 * The virtualized pair at the same counts is what windowing buys once the
 * panel is open. The selection rung times a value change on an open panel
 * alone, which is the path that re-renders each option row.
 */

import { describe } from 'vitest'
import { Combobox } from '../components/combobox/combobox'
import { ComboboxLabel, ComboboxOption } from '../components/combobox/combobox-option'
import { useComboboxDeferredQuery } from '../components/combobox/use-combobox-query'
import { VirtualOptions } from '../primitives/virtual-options'
import { comboboxOptions, type Option } from './fixtures'
import { mountBenches, rerenderBench } from './harness'

/** The query filter a consumer writes, reading the combobox's own deferred query. */
function useFiltered(all: Option[]): Option[] {
	const deferredQuery = useComboboxDeferredQuery()

	const query = deferredQuery.toLowerCase()

	return query ? all.filter((option) => option.label.toLowerCase().includes(query)) : all
}

function OptionsFor({ options: all }: { options: Option[] }) {
	const filtered = useFiltered(all)

	return (
		<>
			{filtered.map((option) => (
				<ComboboxOption key={option.value} value={option.value}>
					<ComboboxLabel>{option.label}</ComboboxLabel>
				</ComboboxOption>
			))}
		</>
	)
}

function VirtualOptionsFor({ options: all }: { options: Option[] }) {
	const filtered = useFiltered(all)

	return (
		<VirtualOptions items={filtered} estimateSize={36}>
			{(option) => (
				<ComboboxOption key={option.value} value={option.value}>
					<ComboboxLabel>{option.label}</ComboboxLabel>
				</ComboboxOption>
			)}
		</VirtualOptions>
	)
}

describe('Combobox · closed (options not rendered)', () => {
	mountBenches(
		[100, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => (
			<Combobox<string>>
				<OptionsFor options={comboboxOptions(count)} />
			</Combobox>
		),
	)
})

describe('Combobox · open (options rendered)', () => {
	mountBenches(
		[100, 500, 2_000],
		(count) => `${count.toLocaleString()} options · open · empty query`,
		(count) => (
			<Combobox<string> open>
				<OptionsFor options={comboboxOptions(count)} />
			</Combobox>
		),
	)
})

describe('Combobox · open · virtualized', () => {
	mountBenches(
		[500, 2_000],
		(count) => `${count.toLocaleString()} options · virtualized`,
		(count) => (
			<Combobox<string> open>
				<VirtualOptionsFor options={comboboxOptions(count)} />
			</Combobox>
		),
	)
})

describe('Combobox · open · selection change', () => {
	const options = comboboxOptions(500)

	// Built once, so a rerender reaches the options only through the context.
	const children = <OptionsFor options={options} />

	const valueAt = (iteration: number) => options[iteration % options.length]?.value

	rerenderBench(
		'500 options · controlled value moves one row',
		() => (
			<Combobox<string> open value={valueAt(0)}>
				{children}
			</Combobox>
		),
		(rerender, iteration) =>
			rerender(
				<Combobox<string> open value={valueAt(iteration + 1)}>
					{children}
				</Combobox>,
			),
	)
})

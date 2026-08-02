/**
 * Combobox mounts its options behind an `open` gate, so the closed rungs
 * measure the trigger and the query plumbing alone — what a page pays for a
 * combobox nobody has touched — and the open rungs add the rendered options.
 * The virtualized pair at the same counts is what windowing buys once the
 * panel is open.
 */

import { describe } from 'vitest'
import { Combobox } from '../components/combobox/combobox'
import { ComboboxLabel, ComboboxOption } from '../components/combobox/combobox-option'
import { useComboboxQuery } from '../components/combobox/use-combobox-query'
import { VirtualOptions } from '../primitives/virtual-options'
import { makeComboboxOptions, type Option } from './fixtures'
import { mountBenches } from './harness'

// Built at collection time: only the render belongs inside the timed region.
const options = new Map([100, 500, 2_000].map((count) => [count, makeComboboxOptions(count)]))

const at = (count: number) => options.get(count) as Option[]

/** The query filter a consumer writes, reading the combobox's own deferred query. */
function useFiltered(all: Option[]): Option[] {
	const { deferredQuery } = useComboboxQuery()

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
				<OptionsFor options={at(count)} />
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
				<OptionsFor options={at(count)} />
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
				<VirtualOptionsFor options={at(count)} />
			</Combobox>
		),
	)
})

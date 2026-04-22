import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { ComboboxVirtualOptions } from '../components/combobox'
import { Combobox } from '../components/combobox/combobox'
import { ComboboxLabel, ComboboxOption } from '../components/combobox/option'
import { makeComboboxOptions } from './fixtures'

const options100 = makeComboboxOptions(100)
const options500 = makeComboboxOptions(500)
const options2k = makeComboboxOptions(2_000)

function OptionsFor({
	options,
	query,
}: {
	options: { value: string; label: string }[]
	query: string
}) {
	const q = query.toLowerCase()

	const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options

	return (
		<>
			{filtered.map((o) => (
				<ComboboxOption key={o.value} value={o.value}>
					<ComboboxLabel>{o.label}</ComboboxLabel>
				</ComboboxOption>
			))}
		</>
	)
}

describe('Combobox · closed (options not rendered)', () => {
	bench('100 options', () => {
		render(
			<Combobox<string>>{(query) => <OptionsFor options={options100} query={query} />}</Combobox>,
		)

		cleanup()
	})

	bench('2,000 options', () => {
		render(
			<Combobox<string>>{(query) => <OptionsFor options={options2k} query={query} />}</Combobox>,
		)

		cleanup()
	})
})

describe('Combobox · open (options rendered)', () => {
	bench('100 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				{(query) => <OptionsFor options={options100} query={query} />}
			</Combobox>,
		)

		cleanup()
	})

	bench('500 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				{(query) => <OptionsFor options={options500} query={query} />}
			</Combobox>,
		)

		cleanup()
	})

	bench('2,000 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				{(query) => <OptionsFor options={options2k} query={query} />}
			</Combobox>,
		)

		cleanup()
	})
})

describe('Combobox · open · virtualized', () => {
	function virtRender(opts: { value: string; label: string }[]) {
		return (
			<Combobox<string> open>
				{(query) => {
					const q = query.toLowerCase()
					const filtered = q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts

					return (
						<ComboboxVirtualOptions items={filtered} estimateSize={36}>
							{(o) => (
								<ComboboxOption key={o.value} value={o.value}>
									<ComboboxLabel>{o.label}</ComboboxLabel>
								</ComboboxOption>
							)}
						</ComboboxVirtualOptions>
					)
				}}
			</Combobox>
		)
	}

	bench('500 options · virtualized', () => {
		render(virtRender(options500))

		cleanup()
	})

	bench('2,000 options · virtualized', () => {
		render(virtRender(options2k))

		cleanup()
	})
})

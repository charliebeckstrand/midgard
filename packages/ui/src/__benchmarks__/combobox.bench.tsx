import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Combobox } from '../components/combobox/combobox'
import { ComboboxLabel, ComboboxOption } from '../components/combobox/combobox-option'
import { useComboboxQuery } from '../components/combobox/use-combobox-query'
import { VirtualOptions } from '../primitives/virtual-options'
import { makeComboboxOptions } from './fixtures'

const options100 = makeComboboxOptions(100)
const options500 = makeComboboxOptions(500)
const options2k = makeComboboxOptions(2_000)

function OptionsFor({ options }: { options: { value: string; label: string }[] }) {
	const { deferredQuery } = useComboboxQuery()

	const q = deferredQuery.toLowerCase()

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
			<Combobox<string>>
				<OptionsFor options={options100} />
			</Combobox>,
		)

		cleanup()
	})

	bench('2,000 options', () => {
		render(
			<Combobox<string>>
				<OptionsFor options={options2k} />
			</Combobox>,
		)

		cleanup()
	})
})

describe('Combobox · open (options rendered)', () => {
	bench('100 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				<OptionsFor options={options100} />
			</Combobox>,
		)

		cleanup()
	})

	bench('500 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				<OptionsFor options={options500} />
			</Combobox>,
		)

		cleanup()
	})

	bench('2,000 options · open · empty query', () => {
		render(
			<Combobox<string> open>
				<OptionsFor options={options2k} />
			</Combobox>,
		)

		cleanup()
	})
})

describe('Combobox · open · virtualized', () => {
	function VirtualOptionsFor({ options }: { options: { value: string; label: string }[] }) {
		const { deferredQuery } = useComboboxQuery()

		const q = deferredQuery.toLowerCase()

		const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options

		return (
			<VirtualOptions items={filtered} estimateSize={36}>
				{(o) => (
					<ComboboxOption key={o.value} value={o.value}>
						<ComboboxLabel>{o.label}</ComboboxLabel>
					</ComboboxOption>
				)}
			</VirtualOptions>
		)
	}

	function virtRender(opts: { value: string; label: string }[]) {
		return (
			<Combobox<string> open>
				<VirtualOptionsFor options={opts} />
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

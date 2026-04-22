import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { Listbox, ListboxLabel, ListboxOption, ListboxVirtualOptions } from '../components/listbox'
import { makeComboboxOptions } from './fixtures'

// Listbox opens on user click, so we can't benchmark the open-panel path the
// same way Combobox does (which has a direct `open` prop). These benches
// measure the closed Listbox at various option counts — which still mount
// everything below the trigger — and the virtualized wrapper rendered inside
// a stand-in role="listbox" container.

const options100 = makeComboboxOptions(100)
const options500 = makeComboboxOptions(500)
const options2k = makeComboboxOptions(2_000)

describe('Listbox · closed (options provided as children)', () => {
	function renderClosed(opts: { value: string; label: string }[]) {
		return (
			<Listbox<string>>
				{opts.map((o) => (
					<ListboxOption key={o.value} value={o.value}>
						<ListboxLabel>{o.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		)
	}

	bench('100 options', () => {
		render(renderClosed(options100))

		cleanup()
	})

	bench('2,000 options', () => {
		render(renderClosed(options2k))

		cleanup()
	})
})

describe('Listbox · options inside a stand-in listbox panel', () => {
	// Bypass the real Listbox open/close state by rendering options inside a
	// matching role="listbox" container — isolates per-option rendering cost.
	function renderPanel(opts: { value: string; label: string }[]) {
		return (
			<div role="listbox" style={{ maxHeight: '400px', overflow: 'auto' }}>
				{opts.map((o) => (
					<div key={o.value} role="option" tabIndex={-1} data-value={o.value}>
						{o.label}
					</div>
				))}
			</div>
		)
	}

	bench('500 options', () => {
		render(renderPanel(options500))

		cleanup()
	})

	bench('2,000 options', () => {
		render(renderPanel(options2k))

		cleanup()
	})
})

describe('Listbox · virtualized', () => {
	function renderVirt(opts: { value: string; label: string }[]) {
		return (
			<div role="listbox" style={{ maxHeight: '400px', overflow: 'auto' }}>
				<ListboxVirtualOptions items={opts} estimateSize={36}>
					{(o) => (
						<ListboxOption key={o.value} value={o.value}>
							<ListboxLabel>{o.label}</ListboxLabel>
						</ListboxOption>
					)}
				</ListboxVirtualOptions>
			</div>
		)
	}

	bench('500 options · virtualized', () => {
		render(renderVirt(options500))

		cleanup()
	})

	bench('2,000 options · virtualized', () => {
		render(renderVirt(options2k))

		cleanup()
	})
})

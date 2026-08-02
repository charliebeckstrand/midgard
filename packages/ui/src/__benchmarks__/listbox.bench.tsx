/**
 * Listbox opens on user click and exposes no direct `open` prop (Combobox
 * does), so these benches measure the closed Listbox at several option counts
 * — everything below the trigger still mounts — plus two stand-ins that reach
 * the panel the real component gates: bare `role="option"` divs, the floor a
 * rendered option cannot beat, and the virtualized wrapper, which should hold
 * flat as the option count grows.
 */

import { describe } from 'vitest'
import { Listbox, ListboxLabel, ListboxOption } from '../components/listbox'
import { VirtualOptions } from '../primitives/virtual-options'
import { comboboxOptions } from './fixtures'
import { mountBenches } from './harness'

const PANEL = { maxHeight: '400px', overflow: 'auto' } as const

describe('Listbox · closed (options provided as children)', () => {
	mountBenches(
		[100, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => (
			<Listbox<string>>
				{comboboxOptions(count).map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{option.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		),
	)
})

describe('Listbox · options inside a stand-in listbox panel', () => {
	// Bypass the real Listbox open/close state by rendering options inside a
	// matching role="listbox" container; isolates per-option rendering cost.
	mountBenches(
		[500, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => (
			<div role="listbox" style={PANEL}>
				{comboboxOptions(count).map((option) => (
					<div key={option.value} role="option" tabIndex={-1} data-value={option.value}>
						{option.label}
					</div>
				))}
			</div>
		),
	)
})

describe('Listbox · virtualized', () => {
	mountBenches(
		[500, 2_000],
		(count) => `${count.toLocaleString()} options · virtualized`,
		(count) => (
			<div role="listbox" style={PANEL}>
				<VirtualOptions items={comboboxOptions(count)} estimateSize={36}>
					{(option) => (
						<ListboxOption key={option.value} value={option.value}>
							<ListboxLabel>{option.label}</ListboxLabel>
						</ListboxOption>
					)}
				</VirtualOptions>
			</div>
		),
	)
})

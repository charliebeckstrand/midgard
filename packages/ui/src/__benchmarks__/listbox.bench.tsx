/**
 * Listbox opens on user click and exposes no direct `open` prop (Combobox
 * does), so these benches measure the closed Listbox at several option counts
 * — everything below the trigger still mounts — plus two stand-ins that reach
 * the panel the real component gates: bare `role="option"` divs, the floor a
 * rendered option cannot beat, and the virtualized wrapper, which should hold
 * flat as the option count grows.
 */

import type { ReactNode } from 'react'
import { describe } from 'vitest'
import { Listbox, ListboxLabel, ListboxOption } from '../components/listbox'
import { VirtualOptions } from '../primitives/virtual-options'
import { comboboxOptions } from './fixtures'
import { mountBenches } from './harness'

const PANEL = { maxHeight: '400px', overflow: 'auto' } as const

/**
 * The option children, built at collection time.
 *
 * A `.map` in the element factory runs inside the timed region, so the closed
 * rungs would charge the mount for building two thousand elements the closed
 * Listbox never renders — three quarters of that number. `combobox.bench.tsx`
 * has no such problem: it passes one component and lets the options build
 * inside a render, where they belong.
 */
const options = new Map(
	[100, 500, 2_000].map((count) => [
		count,
		{
			listbox: comboboxOptions(count).map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			)) as ReactNode[],
			plain: comboboxOptions(count).map((option) => (
				<div key={option.value} role="option" tabIndex={-1} data-value={option.value}>
					{option.label}
				</div>
			)) as ReactNode[],
		},
	]),
)

const at = (count: number) => options.get(count) as { listbox: ReactNode[]; plain: ReactNode[] }

describe('Listbox · closed (options provided as children)', () => {
	mountBenches(
		[100, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => <Listbox<string>>{at(count).listbox}</Listbox>,
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
				{at(count).plain}
			</div>
		),
	)
})

describe('Listbox · virtualized', () => {
	// The virtualizer takes the raw options and renders the window itself, so
	// there is no element list to hoist — only the window's own children build.
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

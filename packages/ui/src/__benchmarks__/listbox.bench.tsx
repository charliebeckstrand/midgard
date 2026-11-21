/**
 * The closed rungs measure the Listbox shell at several option counts, with
 * everything below the trigger mounted. The open rungs mount the real panel
 * through the `open` prop, so they add the rendered options. Bare
 * `role="option"` divs in a matching container are the floor that a rendered
 * `ListboxOption` cannot beat. The virtualized rung mounts the open panel
 * through `VirtualOptions`. jsdom lays nothing out, so its window is empty, and
 * the rung prices the virtualizer with no rows. The browser is where the rows
 * of a real window show.
 */

import type { ReactNode } from 'react'
import { Listbox, ListboxLabel, ListboxOption } from '../components/listbox'
import { VirtualOptions } from '../primitives/virtual-options'
import { compareBenches } from './compare'
import { comboboxOptions } from './fixtures'
import { mountBenches } from './harness'

const PANEL = { maxHeight: '400px', overflow: 'auto' } as const

/**
 * The option children, built at collection time.
 *
 * A `.map` in the element factory runs inside the timed region, so the closed
 * rungs would charge the mount for building two thousand elements the closed
 * Listbox never renders: three quarters of that number. `combobox.bench.tsx`
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

compareBenches('Listbox · closed (options provided as children)', (bench) => {
	mountBenches(
		bench,
		[100, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => <Listbox<string>>{at(count).listbox}</Listbox>,
	)
})

compareBenches('Listbox · open (options rendered)', (bench) => {
	mountBenches(
		bench,
		[500, 2_000],
		(count) => `${count.toLocaleString()} options · open`,
		(count) => <Listbox<string> open>{at(count).listbox}</Listbox>,
	)
})

compareBenches('Listbox · options inside a stand-in listbox panel', (bench) => {
	// Bare role="option" divs in a matching role="listbox" container: the floor
	// that a rendered `ListboxOption` cannot beat.
	mountBenches(
		bench,
		[500, 2_000],
		(count) => `${count.toLocaleString()} options`,
		(count) => (
			<div role="listbox" style={PANEL}>
				{at(count).plain}
			</div>
		),
	)
})

compareBenches('Listbox · virtualized', (bench) => {
	// The virtualizer takes the raw options and renders the window itself, so
	// there is no element list to hoist, only the window's own children build.
	mountBenches(
		bench,
		[500, 2_000],
		(count) => `${count.toLocaleString()} options · virtualized`,
		(count) => (
			<Listbox<string> open>
				<VirtualOptions items={comboboxOptions(count)} estimateSize={36}>
					{(option) => (
						<ListboxOption key={option.value} value={option.value}>
							<ListboxLabel>{option.label}</ListboxLabel>
						</ListboxOption>
					)}
				</VirtualOptions>
			</Listbox>
		),
	)
})

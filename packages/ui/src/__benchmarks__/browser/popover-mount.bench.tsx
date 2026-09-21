/**
 * What a page pays for the popovers nobody has opened.
 *
 * The same shape as `menu-mount.bench.tsx`, one component over. A closed
 * popover renders no panel, because `PresencePortal` mounts nothing until it
 * opens, so the cost is the shell around it. A page multiplies that shell: an
 * info popover beside every field, a filter popover on every column.
 *
 * The rungs ladder the shell apart. `trigger only` is `Popover` plus
 * `PopoverTrigger`, with no `PopoverContent` to build a panel tree.
 * `closed popovers` adds that tree back, which the portal then discards.
 *
 * Read the gaps, not the rows. Each rung contains the one above it, so the step
 * between two is what that layer costs across the whole fan-out.
 */

import type { ReactNode } from 'react'
import { bench, describe } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { comboboxOptions } from '../fixtures'
import { reactHost, WINDOW } from './harness'

/** Popovers on one page: a per-field help affordance's worth. */
const FAN_OUT = 50

const keys = comboboxOptions(FAN_OUT).map((option) => option.value)

/** The ladder, each rung one layer further from a bare button. */
const RUNGS: [string, (key: string) => ReactNode][] = [
	[
		'1 · bare buttons',
		(key) => (
			<button key={key} type="button">
				Details
			</button>
		),
	],
	[
		'2 · trigger only (no panel to build)',
		(key) => (
			<Popover key={key}>
				<PopoverTrigger>Details</PopoverTrigger>
			</Popover>
		),
	],
	[
		'3 · closed popovers (the real thing)',
		(key) => (
			<Popover key={key}>
				<PopoverTrigger>Details</PopoverTrigger>

				<PopoverContent aria-label="Details">The body a consumer writes.</PopoverContent>
			</Popover>
		),
	],
]

describe(`popover · ${FAN_OUT} per mount, closed`, () => {
	for (const [name, render] of RUNGS) {
		bench(
			name,
			() => {
				const mounted = reactHost()

				mounted.render(<div>{keys.map(render)}</div>)

				mounted.destroy()
			},
			WINDOW.slow,
		)
	}
})

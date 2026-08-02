/**
 * Bounds what a `keepMounted` policy could save on the point-anchored tooltip.
 * A surface that opens and closes as the pointer crosses marks pays, per full
 * cycle, to build its portal + motion + content subtree and tear it back down;
 * `keepMounted` would hold that subtree and toggle visibility instead. The
 * ceiling of that saving is the subtree's build/teardown cost — measured here
 * as `mount + unmount surface` minus the bare `react root` baseline — set
 * against `reposition (stays mounted)`, the steady-state cost that remains
 * however the surface is held.
 *
 * The catch `keepMounted` fights is narrow: `AnimatePresence` already keeps the
 * node mounted through a close's exit fade, so rapid churn reuses the element
 * rather than rebuilding it. A full rebuild only lands when the pointer stays
 * off the marks past the fade, then returns — so read `mount + unmount` as the
 * per-*full-cycle* ceiling, not a per-move cost.
 *
 * Finding (Chromium): baseline ~0.11ms, `mount + unmount` ~1.26ms, `reposition`
 * ~0.31ms — so the surface subtree costs ~1.15ms to rebuild, and that is all
 * `keepMounted` could reclaim, only on the rare full cycle the exit fade does
 * not already absorb, in exchange for a resident portal node per tooltip. Not
 * worth building; this bench stays as the surface-lifecycle cost reference and a
 * regression guard on the mount path.
 */

import { bench, describe } from 'vitest'
import { reactHost, WINDOW } from './harness'
import { type Move, Probe } from './tooltip-probe'

// A persistent open tooltip for the steady-state reposition bar: built once, its
// anchor driven each iteration so nothing mounts or unmounts in the timed run.
const mounted = reactHost()

let move: Move = () => {}

mounted.render(
	<Probe
		register={(next) => {
			move = next
		}}
	/>,
)

let tick = 0

describe('tooltip · point-anchored · lifecycle', () => {
	// React root create + render + unmount with a trivial child: the overhead to
	// subtract from the surface bar so its number is the surface subtree alone.
	bench(
		'react root baseline (no surface)',
		() => {
			const bare = reactHost()

			bare.render(<div />)

			bare.destroy()
		},
		WINDOW.settled,
	)

	// Full build + teardown of the tooltip surface (portal + motion + content):
	// the per-full-cycle work `keepMounted` would avoid on a reopen.
	bench(
		'mount + unmount surface',
		() => {
			const surface = reactHost()

			surface.render(<Probe register={() => {}} />)

			surface.destroy()
		},
		WINDOW.settled,
	)

	// Steady-state: repositioning an already-mounted tooltip, the cost that stays
	// whether the surface is unmounted between opens or held by `keepMounted`.
	bench(
		'reposition (stays mounted)',
		() => {
			tick += 1

			mounted.flush(() => move(100 + (tick % 40), 100 + (tick % 24)))
		},
		WINDOW.settled,
	)
})

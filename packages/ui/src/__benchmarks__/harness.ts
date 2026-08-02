/**
 * The shared scenario harness for the jsdom suite: mount-plus-teardown benches
 * over a case list, re-render benches that mount once and time the update
 * alone, and the run-lifetime mount the cascade scenarios drive. The browser
 * suite keeps its own harness — its contenders, sized hosts, and paint-probe
 * settle are a different measurement, not a variation of this one.
 *
 * Every mount bench builds its element inside the timed region, the way a
 * consumer's render does, so `createElement` cost sits where React pays it.
 * Everything else a scenario needs — the fixtures, the columns, the element
 * trees — belongs outside it.
 */

import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { bench } from 'vitest'

/** A tree this harness owns: its own container, its own teardown. */
type Mounted = {
	container: HTMLElement
	rerender: (ui: ReactElement) => void
	unmount: () => void
}

/**
 * Mounts `element` into a container of its own.
 *
 * @remarks Deliberately not the testing library's `render`. That one registers
 * every tree in a module-level set which only `cleanup()` clears — and
 * `cleanup()` unmounts *all* of them, so a mount bench beside a scenario that
 * drives one tree for the whole run would tear that tree down mid-measurement.
 * Its `unmount()` is no escape either: it leaves both the container and the
 * registry entry behind, leaking a div per iteration. Owning the root gives
 * each tree a teardown that reaches exactly itself, which is what lets
 * {@link mountBench} and {@link persistentTree} coexist in one file.
 *
 * `act` still comes from the testing library — it manages the React act
 * environment flag that the bench setup does not set.
 */
function mount(element: ReactElement): Mounted {
	const container = document.createElement('div')

	document.body.append(container)

	const root = createRoot(container)

	act(() => {
		root.render(element)
	})

	return {
		container,
		rerender: (ui) => {
			act(() => {
				root.render(ui)
			})
		},
		unmount: () => {
			act(() => {
				root.unmount()
			})

			container.remove()
		},
	}
}

/**
 * Mounts a tree that stands for the whole run, and returns its container — for
 * a scenario that drives one mounted tree across every iteration (a hover
 * cascade, a resize burst) rather than remounting per sample.
 */
export function persistentTree(element: ReactElement): HTMLElement {
	return mount(element).container
}

/** Registers one full mount-plus-teardown bench — the jsdom initial-render cost. */
export function mountBench(name: string, element: () => ReactElement) {
	bench(name, () => {
		mount(element()).unmount()
	})
}

/**
 * Registers one mount bench per case — the by-size or by-flag sweep most
 * scenarios take, so a scenario declares its axis once instead of repeating
 * the render body per rung.
 */
export function mountBenches<C>(
	cases: readonly C[],
	name: (subject: C) => string,
	element: (subject: C) => ReactElement,
) {
	for (const subject of cases) {
		mountBench(name(subject), () => element(subject))
	}
}

/**
 * Registers a bench that times re-render alone: `initial` mounts in the cycle
 * setup, the timed body drives `step` with the rerender handle and a
 * monotonic iteration counter, and the tree tears down in the cycle teardown.
 *
 * @remarks The mount lands outside the timed region, so a regression here is a
 * reconciliation regression — the one place a dropped memo surfaces unmixed
 * with mount cost.
 */
export function rerenderBench(
	name: string,
	initial: () => ReactElement,
	step: (rerender: Mounted['rerender'], iteration: number) => void,
) {
	let mounted: Mounted | null = null

	let iteration = 0

	bench(name, () => step((ui) => mounted?.rerender(ui), iteration++), {
		setup() {
			iteration = 0

			mounted = mount(initial())
		},
		teardown() {
			mounted?.unmount()

			mounted = null
		},
	})
}
